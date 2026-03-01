import RequestTypePage from "@/components/BorrowRequests/RequestTypePage"
import CheckboxDropdown from "@/components/primitives/CheckboxDropdown"
import type { CheckedOption } from "@/components/primitives/types/CheckedOption"
import RegularPage from "@/components/RegularPage"
import useFetchBorrowRequestsPersonal from "@/hooks/fetch/useFetchBorrowRequestsPersonal"
import { APPROVAL_STATES, TIME_STATES } from "@/types/borrowRequest"
import { useState } from "react"

function Account() {
  const { data: borrowRequests } = useFetchBorrowRequestsPersonal()
  
  const [approvalOptions, setApprovalOptions] = useState<CheckedOption[]>(
    Object.entries(APPROVAL_STATES).map(([key, state]) => ({
      key: key,
      title: state.title,
      checked: true,
    })
  ))

  const [timeOptions, setTimeOptions] = useState<CheckedOption[]>(
    Object.entries(TIME_STATES).map(([key, state]) => ({
      key,
      title: state.title,
      checked: true,
    })
  ))

  const filteredBorrowRequests = borrowRequests?.filter(request => {
    const approvalMatch = approvalOptions.some(option =>
      option.checked && option.key === request.approvalState
    )

    const timeMatch =
      request.approvalState !== "approved"
      || timeOptions.some(option =>
          option.checked && option.key === request.timeState
        )

    return approvalMatch && timeMatch
  }) ?? []

  return (
    <RegularPage title="Account" noBottomPadding>
      <div className="flex gap-2">
        <CheckboxDropdown
          options={approvalOptions}
          setOptions={setApprovalOptions}
        >
          Approved
        </CheckboxDropdown>

        <CheckboxDropdown
          options={timeOptions}
          setOptions={setTimeOptions}
          disabled={
            !approvalOptions.some(opt => opt.title === "Approved" && opt.checked)
          }
        >
          Time
          
        </CheckboxDropdown>
      </div>


      {borrowRequests != null
        && borrowRequests.length != 0
        && <RequestTypePage borrowRequests={filteredBorrowRequests}  />
      }
    </RegularPage>
  )
}

export default Account
