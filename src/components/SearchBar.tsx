import React, { useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import styles from "./NavBar.module.css";

export default function SearchBar({ initial = "" }) {
  const [query, setQuery] = useState(initial);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearching(true);
    const encoded = encodeURIComponent(trimmed);
    // navigate to /search?search_term=...
    navigate(`https://05.hackathon.ethz.ch/search?search_term=${(query)}`);
    setIsSearching(false);
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
          if (e.key === "Enter") handleSearch();
        }}
        aria-label="Search inventory"
      />
      <button onClick={handleSearch} disabled={isSearching} aria-label="Submit search">
      </button>
    </div>
  );
}
