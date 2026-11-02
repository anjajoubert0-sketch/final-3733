import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { useAction } from "./shared";

export const useMyBookings = (enabled = true) => useQuery({ ...orpc.bookings.mine.queryOptions(), enabled });
export const useAllBookings = () => useQuery(orpc.bookings.list.queryOptions());

export const useCreateBooking = () => useAction(orpc.bookings.create.mutationOptions());
export const useScheduleBooking = () => useAction(orpc.bookings.schedule.mutationOptions());
export const useCompleteBooking = () => useAction(orpc.bookings.complete.mutationOptions());
export const useCancelBooking = () => useAction(orpc.bookings.cancel.mutationOptions());
export const useCheckout = () => useAction(orpc.bookings.checkout.mutationOptions());
export const useConfirmPayment = () => useAction(orpc.bookings.confirmPayment.mutationOptions());
