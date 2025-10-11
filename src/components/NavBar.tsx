import styles from "./NavBar.module.css";
import BorrowButton from "./BorrowButton";
import MoreDropdown from "./MoreDropdown";
import SearchBar from "./SearchBar";

export default function NavBar(){
  return(
    <div className={styles.NavBar}>
      <div className={styles.input}><SearchBar/></div>
      <div className={styles.input}><BorrowButton counterValue={1} /></div> 
      <div><MoreDropdown/></div>
    </div>
  );
}

