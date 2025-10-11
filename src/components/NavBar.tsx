import * as React from "react"

import styles from "./NavBar.module.css";
import BorrowButton from "./BorrowButton";
import MoreDropdown from "./MoreDropdown";
import SearchBar from "./SearchBar";
import Logo from "./Logo";
import { type NormalizedPerson } from "@/lib/person"

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ?? "https://05.hackathon.ethz.ch/api"

type LoanRecord = {
  id: number
  item_id: number
  person_id: number
  amount: number
  begin: string
  until: string
  returned?: boolean | null
  returned_at?: string | null
}

type ItemRecord = {
  id: number
  name: string
  category?: string | null
}

type CombinedLoan = LoanRecord & {
  item?: ItemRecord
  person?: NormalizedPerson
}

export default function NavBar(){
  const [borrowedCount, setBorrowedCount] = React.useState<string>("0")

  const fetchData = React.useCallback(async () => {
    try {
      const [loansRes, ] = await Promise.all([
        fetch(`${API_BASE_URL}/loans`),
      ])

      if (!loansRes.ok) {
        throw new Error(`Failed to load loans (HTTP ${loansRes.status})`)
      }

      const loansJson = await loansRes.json()

      const loanData: LoanRecord[] = Array.isArray(loansJson) ? loansJson : []

      const combined = loanData
        .map<CombinedLoan>((loan) => ({
          ...loan,
        }))
        .sort((a, b) => {
          const aTime = new Date(a.until).getTime()
          const bTime = new Date(b.until).getTime()
          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
          if (Number.isNaN(aTime)) return 1
          if (Number.isNaN(bTime)) return -1
          return aTime - bTime
        })

      const activeLoans = combined.filter((loan) => !loan.returned)

      setBorrowedCount(activeLoans.length.toString())
    } catch (caught) {
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return(
    <div className={styles.NavBar}>
      <div className="logo"><Logo /></div>
      <div className={styles.input}><SearchBar/></div>
      <div className={styles.input}><BorrowButton counterValue={ borrowedCount }/></div>
      <div><MoreDropdown/></div>
    </div>
  );
}
