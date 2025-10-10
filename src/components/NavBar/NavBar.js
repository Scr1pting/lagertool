import React, { useState } from "react";
import styles from "./NavBar.module.css";

export default function NavBar(){
    const [query,setQuery] = useState("");

    const handleSearch = () =>{
        console.log("User searched for: ", query);
    }
    return(
        <div className={styles.NavBar}>
            <h1>React Search </h1>
            <input 
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
        </div>
    )
}
