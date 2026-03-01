import RequestTypePage from "@/components/BorrowRequests/RequestTypePage"
import CheckboxDropdown from "@/components/primitives/CheckboxDropdown"
import type { CheckedOption } from "@/components/primitives/types/CheckedOption"
import RegularPage from "@/components/RegularPage"
import useFetchBorrowRequestsPersonal from "@/hooks/fetch/useFetchBorrowRequestsPersonal"
import { capitalize } from "@/lib/capitalize"
import { APPROVAL_STATES, TIME_STATES } from "@/types/borrowRequest"
import { useState } from "react"

function Account() {
  const { data: borrowRequests } = useFetchBorrowRequestsPersonal()
  
  const [approvalOptions, setApprovalOptions] = useState<CheckedOption[]>(
    Object.values(APPROVAL_STATES).map(state => ({
      title: capitalize(state.title),
      checked: true
    }))
  )

  const [timeOptions, setTimeOptions] = useState<CheckedOption[]>(
    Object.values(TIME_STATES).map(state => ({
      title: capitalize(state.title),
      checked: true
    }))
  )

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
        && <RequestTypePage borrowRequests={borrowRequests}  />
      }
    </RegularPage>
  )
}

export default Account
