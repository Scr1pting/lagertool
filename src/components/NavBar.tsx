// import { useState } from "react";
import styles from "./NavBar.module.css";
import BorrowButton from "./BorrowButton";
import AddDropdown from "./AddDropdown";
import SearchBar from "./SearchBar";


export default function NavBar(){
    return(
        <div className = {styles.NavBar}>
            <div><SearchBar/></div>
            <div><BorrowButton placeholderText="0"/></div>
            <div><AddDropdown/></div>
        </div>
    )
}
