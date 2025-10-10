import React, { useState } from "react";
import styles from "./NavBar.module.css";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";


export default function NavBar(){
    const [query,setQuery] = useState("");

    const handleSearch = () =>{
        console.log("User searched for: ", query);
    }
    return(
        <input 
        className={styles.button}
        type="text" 
        placeholder="Search..." 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        onKeyDown={(e) => {
            if (e.key === "Enter") {
            handleSearch();
            }
        }
        }/>
    )
}
