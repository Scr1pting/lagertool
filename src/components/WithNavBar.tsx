import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";

function WithNavLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

export default WithNavLayout;
