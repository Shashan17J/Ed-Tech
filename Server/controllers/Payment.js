const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const crypto = require("crypto");
const mailSender = require("../utils/mailSender");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail");
const {
  paymentSuccessEmail,
} = require("../mail/templates/paymentSuccessEmail");
const CourseProgress = require("../models/CourseProgress");

// capture the payment and initiate the razorpay order ->(For Multiple Item)
exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user.id;

  if (courses.length === 0) {
    return res.json({ success: false, message: "Please provide Course Id" });
  }
  let total_amount = 0;

  for (const course_id of courses) {
    let course;
    try {
      course = await Course.findById(course_id);
      if (!course) {
        return res
          .status(200)
          .json({ success: false, message: "Failed to find course" });
      }

      // check if user already enrolled or not
      const uid = new mongoose.Types.ObjectId(userId);

      if (course.studentEnrolled.includes(uid)) {
        return res
          .status(200)
          .json({ success: false, message: "Student is already Enrolled" });
      }

      // Add the price of the course to the total amount
      total_amount += course.price;
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  const options = {
    amount: total_amount * 100, // if amount is 50 them 50*100 = 50.00
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  };

  // Initiate the payment using Razorpay
  try {
    const paymentResponse = await instance.orders.create(options);
    res.json({
      success: true,
      data: paymentResponse,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Could not initiate order." });
  }
};

// verify Signature of Razorpay and Server (Authorization) ->(For Multiple Item)
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id;
  const razorpay_payment_id = req.body?.razorpay_payment_id;
  const razorpay_signature = req.body?.razorpay_signature;
  const courses = req.body?.courses;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(200).json({
      success: false,
      message: "Payment failed",
    });
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    //Payment successfull &  enroll student into coures
    await enrollStudents(courses, userId, res);
    // return res
    return res.status(200).json({ success: true, message: "Payment Verified" });
  }
  return res.status(200).json({ success: "false", message: "Payment Failed" });
};

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;

  const userId = req.user.id;

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" });
  }

  try {
    const enrolledStudent = await User.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    );
  } catch (error) {
    console.log("error in sending mail", error);
    return res
      .status(400)
      .json({ success: false, message: "Could not send email" });
  }
};

// enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Courses not found" });
  }

  for (const courseId of courses) {
    try {
      // find the course and enroll the student in it
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentEnrolled: userId } },
        { new: true }
      );

      if (!enrolledCourse) {
        return res
          .status(500)
          .json({ success: false, message: "Course not found" });
      }

      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userID: userId,
        completedVideo: [],
      });

      // Find the student and add the course to their list of enrolled courses
      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      );
      if (!enrolledStudent) {
        return res
          .status(500)
          .json({ success: false, message: "User not found" });
      }

      console.log("Enrolled student: ", enrolledStudent);
      // Send an email notification to the enrolled student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      );
      console.log("Email sent successfully: ", emailResponse.response);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ success: false, error: error.message });
    }
  }
};

// capture the payment and initiate the razorpay order ->(For Singal Item)
// exports.capturePayment = async (req, res) => {
//   // get courseID and UserId
//   const { course_id } = req.body;
//   const userId = req.user.id;

//   // valid course Id
//   if (!course_id) {
//     return res.json({
//       success: false,
//       message: "Please provide valid course ID",
//     });
//   }

//   // valid courseDetails
//   let course;
//   try {
//     course = await Course.findById(course_id);
//     if (!course) {
//       return res.json({
//         success: false,
//         message: "Could not found the course",
//       });
//     }

//     // converting string userId into objectId
//     // reason -> inside course model userId type is objectId and right now userId is in string type, inside course userid stored as objectId
//     const uid = new mongoose.Types.ObjectId(userId);

//     //checking if user is not buying the same course again ? validation
//     if (course.studentEnrolled.includes(uid)) {
//       return res.status(200).json({
//         success: false,
//         message: "Student is already enrolled",
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }

//   // order create
//   const amount = course.price;
//   const currency = "INR";

//   const options = {
//     amount: amount * 100, //mandotary
//     currency, //mandotary
//     receipt: Math.random(Date.now()).toString(), //optional
//     notes: {
//       //optional
//       courseId: course_id,
//       userId,
//     },
//   };

//   try {
//     // Initiate the payment using razorpay
//     const paymentResponse = await instance.orders.create(options);
//     console.log(paymentResponse);

//     // return response
//     return res.status(200).json({
//       success: true,
//       courseName: course.courseName,
//       courseDescription: course.courseDescription,
//       thumbnail: course.thumbnail,
//       orderId: paymentResponse.id,
//       currency: paymentResponse.currency,
//       amount: paymentResponse.amount,
//     });
//   } catch (error) {
//     console.log(error);
//     res.json({
//       success: false,
//       message: "Could not listen order",
//     });
//   }
// };

// verify Signature of Razorpay and Server (Authorization) ->(For Singal Item)
// exports.verifyPayment = async (req, res) => {
//   // Server SercetKey(Mine)
//   const webhookSecret = "12345678";

//   // Secret from Razorpay
//   const signature = req.headers["x-razorpay-signature"];

//   // sha256 is algorithm
//   const shasum = crypto.createHmac("sha256", webhookSecret);
//   shasum.update(JSON.stringify(req.body));
//   const digest = shasum.digest("hex");

//   if (signature === digest) {
//     console.log("Payment is Authorized");

//     const { courseId, userId } = req.body.payload.payment.entity.notes;

//     try {
//       // fulfil the action

//       // find the course and enroll the student(user) in it
//       const enrolledCourse = await Course.findById(
//         { _id: courseId },
//         { $push: { studentsEnrolled: userId } },
//         { new: true }
//       );

//       console.log(enrolledStudent);

//       if (!enrolledCourse) {
//         return res.status(500).json({
//           success: false,
//           message: "Course not Found",
//         });
//       }
//       console.log(enrolledCourse);

//       // find the student and add the course to their list of enrolled course
//       const enrolledStudent = await User.findById.findOneAndUpdate(
//         { _id: userId },
//         { $push: { courses: courseId } },
//         { new: true }
//       );
//       console.log(enrolledCourse);

//       // mail send of confirmation enrollment
//       const emailResponse = await mailSender(
//         enrolledStudent.email,
//         "Congratulations from StudyNotion",
//         "Congratulations, you are onboarded into new StudyNotion Course"
//       );
//       console.log(emailResponse);

//       return res.status(200).json({
//         success: true,
//         message: "Signature Verified and Course Added",
//       });
//     } catch (error) {
//       console.log(error);
//       return res.status(500).json({
//         success: false,
//         message: error.message,
//       });
//     }
//   } else {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid request",
//     });
//   }
// };
