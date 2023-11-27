import React from "react";
import { useEffect } from "react";
import { useState } from "react";

const RequirementsField = ({
  name,
  label,
  register,
  errors,
  setValue,
  getValues,
}) => {
  const [requirement, setRequirement] = useState("");
  const [requirementList, setRequirementList] = useState([]);

  useEffect(() => {
    register(name, {
      // required:ue,
      validate: (value) => value.length > 0,
    });
  }, []);

  // useEffect(() => {
  //     setValue(name, requirementList);
  // },[requirementList])

  const handleAddRequirement = () => {
    if (requirement) {
      setRequirementList([...requirement, requirement]);
      setRequirement("");
    }
  };

  const handleRemoveRequirement = (index) => {
    const updatedRequirementList = [...requirementList];
    updatedRequirementList.splice(index, 1);
    setRequirementList(updatedRequirementList);
  };

  return (
    <div>
      <label>
        {label}
        <sup>*</sup>
      </label>
      <div>
        <input
          type="text"
          id={name}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          className="w-full"
        />
        <button
          type="button"
          onClick={handleAddRequirement}
          className="font-semibold text-yellow-50"
        >
          Add
        </button>
      </div>
      {requirementList.length > 0 && (
        <ul>
          {requirementList.map((requirement, index) => (
            <li key={index} className="flex item-center text-richblack-5">
              <span>{requirement}</span>
              <button
                type="button"
                onClick={() => handleRemoveRequirement(index)}
                className="text-xs text-pure-greys-300"
              >
                clear
              </button>
            </li>
          ))}
        </ul>
      )}
      {errors[name] && <span>{label} is required</span>}
    </div>
  );
};

export default RequirementsField;
