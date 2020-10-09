import React, { useEffect, useState } from "react";
import Category from "../categoria";
import "./catalogo.css";
import ProductCard from "../ProductCard/ProductCard";
import SearchBar from "../searchBar";
// import { Link } from "react-router-dom";
// import axios from "axios";

const Catalogue = ({ props }) => {
  // console.log(props);
  //TODO: cuadrar responsive
  return (
    <div className="container-ppal">
      <div className="container">
        <div className="category">
          <Category />
        </div>
        <div className="cat-ppal">
          <div className="catalogo">
            {props.map((fit) => {
              return (
                <li key={fit.id}>
                  {" "}
                  <ProductCard product={fit} />{" "}
                </li>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalogue;
