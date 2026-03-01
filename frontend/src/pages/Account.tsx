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
    APPROVAL_STATES.map(state => ({
      title: state.charAt(0).toUpperCase() + state.slice(1),
      checked: true
    }))
  )

  const [timeOptions, setTimeOptions] = useState<CheckedOption[]>(
    TIME_STATES.map(state => ({
      title: state.charAt(0).toUpperCase() + state.slice(1),
      checked: true
    }))
  )

  return (
    <RegularPage title="Account" noBottomPadding>
      <div className="flex gap-2">
        <CheckboxDropdown
          title="Approval"
          options={approvalOptions}
          setOptions={setApprovalOptions}
        />

        <CheckboxDropdown
          title="Approval"
          options={timeOptions}
          setOptions={setTimeOptions}
        />
      </div>


      {borrowRequests != null
        && borrowRequests.length != 0
        && <RequestTypePage borrowRequests={borrowRequests}  />
      }
    </RegularPage>
  )
}

export default Account
