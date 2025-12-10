import React from "react";
import Sidebar from "./admin/Sidebar";
import { Outlet } from "react-router-dom";

function User() {
  return (
    <div className="">
      <Sidebar />
      <Outlet />
    </div>
  );
}

export default User;
