import { useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import styles from "./NavBar.module.css";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    console.log("User searched for: ", query);
    fetch(`https://05.hackathon.ethz.ch/search?search_term=${(query)}`)
  };

  return (
    <div className={styles.searchWrapper}>
      <HiOutlineMagnifyingGlass className={styles.searchIcon} aria-hidden="true" />
      <input
        className={styles.searchInput}
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch();
          }
        }}
        aria-label="Search inventory"
      />
    </div>
  );
}
