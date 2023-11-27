const Category = require("../models/Category")

// create Category Handler
exports.createCategory = async(req, res) => {
    try {
        // fetch Data
        const {name, description} = req.body;

        // validation
        if(!name || !description) {
            return res.status(400).json ({
                success:false,
                message:'All field are required',
            })
        }

        // create entry in DB
        const CategoryDetails = await Category.create({
            name: name,
            description: description,
        });
        console.log(CategoryDetails);

        // return response
        return res.status(200).json({
            success:true,
            message:"Category Created Successfully",
        })
    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}


// showAllcategory handler funtion
exports.showAllCategory = async(req, res) => {
    try {
        const allCategory = await Category.find(
            {},
            {name:true, description:true}
            );
        res.status(200).json({
            success:true,
            message:"All Category returned successfully",
            allCategory,
        })
    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

// categoryPageDetails

exports.categoryPageDetails = async (req, res) => {
    try {
        // get courseId
        const {categoryId} = req.body;

        // get courses for specified categoryId
        const selectedCategory = await Category.findById(categoryId)
                                                .populate("course")
                                                .exec();

        // validation
        if(!selectedCategory) {
            return res.status(404).json ({
                success:false,
                message:"Data Not Found",
            })
        }

        // get courses for different categories
        const differentCategories = await Category.findById({
                                    // ne means not-equal
                                    _id: {$ne: categoryId},
                                    })
                                    .populate('course')
                                    .exec();


        // get top selling courses

        // return response
        return res.status(200).json({
            success:true,
            data: {
                selectedCategory,
                differentCategories,

            },
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}