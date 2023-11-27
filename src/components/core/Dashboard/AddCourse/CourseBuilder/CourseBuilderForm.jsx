import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";

const CourseBuilderForm = () => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const [editSectionName, setEditSectionName] = useState();

  return (
    <div>
      <p>Courses Builder</p>
      <form>
        <div>
          <label>
            Section Name <sup>*</sup>
          </label>
          <input
            id="sectionName"
            placeholder="Add section name"
            {...register("sectionName", { required: true })}
            className="w-full"
          />
          {errors.sectionName && <span>Section Name is required</span>}
        </div>
        <div>
          <IconBtn
            type="Submit"
            text={editSectionName ? "Edit Section Name" : "Create Section"}
            outline={true}
            customClasses={"text-white"}
          >
            <GrAddCircle className=""/>
          </IconBtn>
        </div>
      </form>
    </div>
  );
};

export default CourseBuilderForm;
