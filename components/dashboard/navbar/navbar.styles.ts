import { tv } from "@heroui/react";

export const StyledBurgerButton = tv({
  base: "absolute flex flex-col justify-around w-6 h-6 bg-transparent border-none cursor-pointer p-0 z-[202] focus:outline-none lg:hidden",
  variants: {
    open: {
      true: "[&_div]:bg-primary",
    },
  },
});

export const BurgerInner = tv({
  base: "w-6 h-0.5 bg-default-900 rounded-xl transition-all relative",
});
