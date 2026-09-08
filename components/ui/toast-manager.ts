"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";

export const createToastManager = ToastPrimitive.createToastManager;
export const toast = createToastManager();
