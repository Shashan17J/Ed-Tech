import { useSelector } from "react-redux";
import RenderCartCourses from "../../Dashboard/Cart/RenderCartCourses";
import RenderTotalAmount from "./RenderTotalAmount";

export default function Cart() {
  const { total, totalItems } = useSelector((state) => state.auth);

  return (
    <div className="text-white">
      <h1>Your Cart</h1>
      <p>{totalItems} Course in Cart</p>

      {total > 0 ? (
        <div>
          <RenderCartCourses />
          <RenderTotalAmount />
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
