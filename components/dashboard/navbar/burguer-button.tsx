import React from "react";
import { useSidebarContext } from "../layout-context";
import { StyledBurgerButton, BurgerInner } from "./navbar.styles";

export const BurguerButton = () => {
  const { collapsed, setCollapsed } = useSidebarContext();

  return (
    <div
      className={StyledBurgerButton({ open: collapsed })}
      onClick={setCollapsed}
    >
      <div className={BurgerInner()} />
      <div className={BurgerInner()} />
      <div className={BurgerInner()} />
    </div>
  );
};
