const RatingAndReviews = require("../models/RatingAndReview");
const Course = require("../models/Course");
const mongoose = require("mongoose");

// createRating
exports.createRating = async (req, res) => {
  try {
    // get user id
    const userId = req.user.id;

    // fetch data from user id
    const { rating, review, courseId } = req.body;

    // check if user is enrolled or not
    const courseDetails = await Course.findOne({
      _id: courseId,
      // eq means equal to
      studentEnrolled: { $elemMatch: { $eq: userId } },
    });

    console.log("..userId", userId);
    console.log("...rating", rating);
    console.log("...review", review);
    console.log("...courseId", courseId);

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Student is not enrolled in the course",
      });
    }

    // check if user is already reviewed the course
    const alreadyReviewed = await RatingAndReviews.findOne({
      user: userId,
      course: courseId,
    });
    if (alreadyReviewed) {
      return res.status(403).json({
        success: false,
        message: "Course is already reviewd by the user",
      });
    }

    // create rating and review
    const ratingReview = await RatingAndReviews.create({
      rating,
      review,
      course: courseId,
      user: userId,
    });
    // update the course with rating/review
    const updatedCourseDetails = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          RatingAndReviews: ratingReview._id,
        },
      },
      { new: true }
    );

    console.log(updatedCourseDetails);
    // return response
    return res.status(200).json({
      success: true,
      message: "Rating and Review created Successfully",
      ratingReview,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getAverageRating

exports.getAverageRating = async (req, res) => {
  try {
    // get course id
    const courseId = req.body.courseid;

    // calculate avg rating
    // aggregate funtion return an array(we only get one value now)
    const result = await RatingAndReviews.aggregate([
      {
        $match: {
          course: new mongoose.Type.ObjectId(courseId),
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "rating" },
        },
      },
    ]);

    // return rating
    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        averageRating: result[0].averageRating,
      });
    }

    // if  no rating/Review exist
    return res.status(200).json({
      success: true,
      message: "Average Rating is 0, no rating given till now",
      averageRating: 0,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getAllRating

exports.getAllRating = async (req, res) => {
  try {
    const allReviews = await RatingAndReviews.find({})
      .sort({ rating: "desc" })
      .populate({
        path: "user",
        select: "firstName lastName email image",
      })
      .populate({
        path: "course",
        select: "courseName",
      })
      .exec();

    // console.log("......", allReviews);
    return res.status(200).json({
      success: true,
      message: "All reviews fetched successfully",
      data: allReviews,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
