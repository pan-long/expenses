import React, { Component } from 'react';

export default class ExpenseIcon extends Component {
  iconFrom(category) {
    switch (category) {
      case "Dining":
        return "local_dining";
      case "Entertainment":
        return "local_movies";
      case "Transportation":
        return "local_taxi";
      case "Groceries":
        return "local_grocery_store";
      case "Rental":
        return "home";
      case "Learning":
        return "book"
      case "Shopping":
        return "local_mall";
      case "Hobbies":
        return "local_library";
      default:
        return "attach_money";
    }
  }

  render() {
    return (
      <span
        className={`mdc-list-item__start-detail ${this.props.category}`}
        role="presentation"
      >
        <i className="material-icons" aria-hidden="true">
          {this.iconFrom(this.props.category)}
        </i>
      </span>
    );
  }
}
