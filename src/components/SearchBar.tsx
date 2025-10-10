import { useState } from "react";
<<<<<<< HEAD
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import styles from "./NavBar.module.css";
=======
import styles from "./NavBar.module.css";
// import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
>>>>>>> 8ae0a84ac7396fdc6955cf35b66636e1a389a479

export default function SearchBar() {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    console.log("User searched for: ", query);
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
