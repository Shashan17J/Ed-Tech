const {instance} = require('../config/razorpay');
const Course = require("../models/Course");
const User = require('../models/User');
const mailSender = require("../utils/mailSender");
const { default: mongoose } = require("mongoose");
const {courseEnrollmentEmail} = require('../mail/templates/courseEnrollmentEmail');


// capture the payment and initiate the razorpay order
exports.capturePayment = async (req, res) => {
    // get courseID and UserId
    const {course_id} = req.body;
    const userId = req.user.id;

    // valid course Id
    if(!course_id) {
        return res.json({
            success:false,
            message:'Please provide valid course ID',
        })
    };

    // valid courseDetails
    let course;
    try{
        course = await Course.findById(course_id);
        if(!course) {
            return res.json({
                success:false,
                message:'Could not found the course',
            })
        }

        // converting string userId into objectId 
        // reason -> inside course model userId type is objectId and right now userId is in string type, inside course userid stored as objectId
        const uid = new mongoose.Types.ObjectId(userId);

        //checking if user is not buying the same course again ? validation
        if(course.studentEnrolled.includes(uid)) {
            return res.status(200).json({
                success:false,
                message:'Student is already enrolled',
            })
        }

    } catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }

    // order create
    const amount = course.price;
    const currency = "INR";

    const options = {
        amount: amount*100,     //mandotary
        currency,         //mandotary
        receipt: Math.random(Date.now()).toString(),  //optional
        notes:{          //optional
            courseId: course_id,
            userId,
        }
    };


    try{
        // Initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options);
        console.log(paymentResponse);
    
        // return response
        return res.status(200).json({
            success:true,
            courseName:course.courseName,
            courseDescription:course.courseDescription,
            thumbnail:course.thumbnail,
            orderId:paymentResponse.id,
            currency:paymentResponse.currency,
            amount:paymentResponse.amount,
        })
    } catch(error) {
        console.log(error);
        res.json({
            success:false,
            message:'Could not listen order',
        })
    }
}

// verify Signature of Razorpay and Server (Authorization)

exports.verifyPayment = async(req, res) => {
    // Server SercetKey(Mine)
    const webhookSecret = '12345678';

    // Secret from Razorpay
    const signature = req.headers["x-razorpay-signature"];

    // sha256 is algorithm
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if(signature === digest) {
        console.log("Payment is Authorized");

        const {courseId, userId} = req.body.payload.payment.entity.notes;

        try{
            // fulfil the action

            // find the course and enroll the student(user) in it
            const enrolledCourse = await Course.findById(
                                  {_id: courseId},
                                  {$push:{studentsEnrolled: userId}},
                                  {new:true},       
            );

            console.log(enrolledStudent);

            if(!enrolledCourse) {
                return res.status(500).json({
                    success:false,
                    message:'Course not Found',
                })
            }
            console.log(enrolledCourse);

            // find the student and add the course to their list of enrolled course
            const enrolledStudent = await User.findById.findOneAndUpdate(
                                             {_id:userId},
                                             {$push:{courses:courseId}},
                                             {new:true},
            );
            console.log(enrolledCourse);

            // mail send of confirmation enrollment
            const emailResponse = await mailSender(
                                     enrolledStudent.email,
                                     "Congratulations from StudyNotion",
                                     "Congratulations, you are onboarded into new StudyNotion Course",
            );
            console.log(emailResponse);

            return res.status(200).json({
                success:true,
                message:'Signature Verified and Course Added',
            })
        } catch(error) {
            console.log(error);
            return res.status(500).json({
                success:false,
                message:error.message,
            })
        }

    } else {
        return res.status(400).json({
            success:false,
            message:'Invalid request',
        })
    }
}