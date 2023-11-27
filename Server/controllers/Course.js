const Course = require('../models/Course');
const Category = require("../models/Category");
const User = require("../models/User");
const {uploadImageToCloudinary} = require("../utils/imageUploader");
require('dotenv').config();

// createCourse handler funtion
exports.createCourse = async (req, res) => {
    try {
        // get user ID from request object
        const userId = req.user.id;

        // fetch data
        let {
            courseName, 
            courseDescription, 
            whatYouWillLearn, 
            price, 
            tag, 
            category, 
            status, 
            instructions
        } = req.body;

        // get thumbnail
        const thumbnail = req.files.thumbnailImage;

        // validation (Check if any of the required fields are missing)
        if(
            !courseName ||
            !courseDescription ||
            !whatYouWillLearn || 
            !price || 
            !tag || 
            !thumbnail || 
            !category
            ) {
            return res.status(400).json({
                success:false,
                message:'All fields are required',
            })
        }

        if (!status || status === undefined) {
			status = "Draft";
		}

        // check for instructor inside DB
        const instructorDetails = await User.findById(userId, {
            accountType: "Instructor",
        });
        // console.log("Instructor Details", instructorDetails);

        if(!instructorDetails) {
            return res.status(404).json({
                success:false,
                message:'Instructor Details not found',
            })
        }

        // check given category is valid or not
        const categoryDetails = await Category.findById(category);
        if(!categoryDetails) {
            return res.status(404).json({
                success:false,
                message:'Category Details not found',
            })
        }

        // Upload Image top Cloudinary
        const thumbnailImage = await uploadImageToCloudinary(
            thumbnail, 
            process.env.FOLDER_NAME
            );
        console.log(thumbnailImage);

        // create an entry for new Cloudinary
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn: whatYouWillLearn,
            price,
            tag: tag,
            category: categoryDetails._id,
            thumbnail:thumbnailImage.secure_url,
            status: status,
			instructions: instructions,
        });

        // add the new course to the user schema of Instructor
        await User.findByIdAndUpdate(
            {
                _id: instructorDetails._id
            },  //find instructor(user) id

            {
                $push: {
                    courses: newCourse._id,
                }
            },
            {new: true},
        );

        // Add the new course to the Categories
		await Category.findByIdAndUpdate(
			{ _id: category },
			{
				$push: {
					course: newCourse._id,
				},
			},
			{ new: true }
		);

        // return res
        return res.status(200).json({
            success:true,
            message:"Course Created Successfully",
            data:newCourse,
        });

    } catch(error) {
        console.error(error);
        res.status(500).json({
            success:false,
            message:'Failed to create Course',
            error: error.message,
        });
    }
};


// getAllCourses handler 

exports.getAllCourses = async (req, res) => {
    try {
        const allCourses = await Course.find(
                                            {}, 
                                            {
                                                courseName:true,
                                                price:true,
                                                thumbnail:true,
                                                instructor:true,
                                                ratingAndReviews:true,
                                                studentEnrolled:true,
                                            })
                                                .poplulate("instructor")
                                                .exec();
        return res.status(200).json({
            success:true,
            message:'Data for all courses fatched successfully',
            data:allCourses,
        })
    } catch(error) {
        console.log(error);
        res.status(500).json({
            success:false,
            message:'Failed Fetch course data',
            error: error.message,
        })
    }
}

// getCourse Details
exports.getCourseDetails = async (req,res) => {
    try {
        // get id 
        const {courseId} = req.body;

        // find course details
        const courseDetails = await Course.find(
                              {_id:courseId})
                              .populate(
                                {
                                path:"instructor",
                                populate: {
                                    path:"additionalDetails",
                                }
                            }
        )
                               .populate("category")
                            //    .populate("ratingAndreviews")
                               .populate({
                                path:"courseContent",
                                populate:{
                                    path:"subSection",
                                }
                               })
                               .exec();

        // validation
        if(!courseDetails) {
            return res.status(400).json ({
                success:false,
                message:`Could not find the course with ${courseId}`,
            })
        }
            // return response
            return res.status(200).json({
                success:true,
                message:"Course Details fetched Successfully",
                data:courseDetails,
            })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
}