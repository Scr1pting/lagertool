import BorrowCalendar from "@/components/Calendar";

export default function BorrowPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-3xl font-bold mb-4">Select Borrow Date</h1>
      <BorrowCalendar />
    </div>
  );
}