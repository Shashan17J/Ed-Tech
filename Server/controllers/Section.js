// const { request } = require('express');
const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");

exports.createSection = async (req, res) => {
  try {
    // data fetch
    const { sectionName, courseId } = req.body; //course id for update the course

    // data validation
    if (!sectionName || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Missing Properties",
      });
    }

    // create section
    const newSection = await Section.create({ sectionName });

    // update course content array with section ObjectId
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          courseContent: newSection._id,
        },
      },
      { new: true }
    )
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    console.log(updatedCourse);
    // Return the updated course object in the response
    res.status(200).json({
      success: true,
      message: "Section created successfully",
      updatedCourse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to create Section, please try again",
      error: error.message,
    });
  }
};

// updateSection handler
exports.updateSection = async (req, res) => {
  try {
    // data fetch
    const { sectionName, sectionId, courseId } = req.body;

    // data validation
    if (!sectionName || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "Missing Properties",
      });
    }

    // update data
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true }
    );

    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    // return res
    return res.status(200).json({
      success: true,
      message: section,
      data: course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update Section, please try again",
      error: error.message,
    });
  }
};

// deleteSection Handler
exports.deleteSection = async (req, res) => {
  try {
    // get Id - assuming thet we are sending ID in params
    const { sectionId, courseId } = req.body;

    await Course.findByIdAndUpdate(courseId, {
      $pull: {
        courseContent: sectionId,
      },
    });
    const section = await Section.findById(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    //   Delete the associated subsections
    await SubSection.deleteMany({ _id: { $in: section.subSection } });

    // use findByIdandDelete
    await Section.findByIdAndDelete(sectionId);

    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec();

    // return res
    return res.status(200).json({
      success: true,
      message: "Section Deleted Successfully",
      data: course,
    });
  } catch (error) {
    console.error("Error deleting section:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete Section, please try again",
      error: error.message,
    });
  }
};
