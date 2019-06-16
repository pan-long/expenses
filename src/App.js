import React, { Component } from "react";
import { ExpenseList, ExpenseForm, LoadingBar } from "./components/index";
import { MDCSnackbar } from "@material/snackbar/dist/mdc.snackbar.js";

import "@material/fab/dist/mdc.fab.css";
import "@material/button/dist/mdc.button.css";
import "@material/toolbar/dist/mdc.toolbar.css";
import "@material/snackbar/dist/mdc.snackbar.css";
import "@material/card/dist/mdc.card.css";

import "./App.css";

class App extends Component {
  constructor() {
    super();

    this.clientId =
      process.env.GAPI_CLIENT_ID ||
      "158651034254-6fvn230jj7bsmvmrck1n4f2ue1oqim5m.apps.googleusercontent.com";
    this.spreadsheetId =
      process.env.REACT_APP_SHEET_ID ||
      "1GDPb4cFsq5fwtSebCrgT0qm2n7jLWOZ9CFh4d72dBjI";

    this.state = {
      signedIn: undefined,
      categories: [],
      expenses: [],
      processing: true,
      expense: {},
      currentMonth: undefined,
      previousMonth: undefined,
      showExpenseForm: false
    };
  }

  componentDidMount() {
    window.gapi.load("client:auth2", () => {
      window.gapi.client
        .init({
          discoveryDocs: [
            "https://sheets.googleapis.com/$discovery/rest?version=v4"
          ],
          clientId: this.clientId,
          scope:
            "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly"
        })
        .then(() => {
          window.gapi.auth2
            .getAuthInstance()
            .isSignedIn.listen(this.signedInChanged);
          this.signedInChanged(
            window.gapi.auth2.getAuthInstance().isSignedIn.get()
          );
        });
    });

    window.onpopstate = (event) => {
      if (event.state) {
        this.setState(event.state);
      }
    }
  }

  pushToHistory = () => {
    window.history.pushState(this.state, null, "");
  }

  signedInChanged = (signedIn) => {
    this.setState({ signedIn: signedIn });
    if (this.state.signedIn) {
      this.load();
    }
  }

  handleExpenseSubmit = () => {
    this.setState({ processing: true, showExpenseForm: false });
    const submitAction = (this.state.expense.id
      ? this.update
      : this.append).bind(this);
    submitAction(this.state.expense).then(
      response => {
        this.snackbar.show({
          message: `Expense ${this.state.expense.id ? "updated" : "added"}!`
        });
        window.history.back();
        this.load();
      },
      response => {
        console.error("Something went wrong");
        console.error(response);
        this.setState({ loading: false });
      }
    );
  }

  handleExpenseChange = (attribute, value) => {
    this.setState({
      expense: Object.assign({}, this.state.expense, { [attribute]: value })
    });
  }

  handleExpenseDelete = (expense) => {
    this.setState({ processing: true, showExpenseForm: false });
    const expenseRow = expense.id.substring(10);
    window.gapi.client.sheets.spreadsheets
      .batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 987794790,
                  dimension: "ROWS",
                  startIndex: expenseRow - 1,
                  endIndex: expenseRow
                }
              }
            }
          ]
        }
      })
      .then(
        response => {
          this.snackbar.show({ message: "Expense deleted!" });
          window.history.back()
          this.load();
        },
        response => {
          console.error("Something went wrong");
          console.error(response);
          this.setState({ loading: false });
        }
      );
  }

  handleExpenseSelect = (expense) => {
    this.setState({ expense: expense, showExpenseForm: true },
      this.pushToHistory);
  }

  handleExpenseCancel = () => {
    window.history.back();
  }

  onExpenseNew() {
    const now = new Date();
    this.setState({
      showExpenseForm: true,
      expense: {
        amount: "",
        description: "",
        date: `${now.getFullYear()}-${now.getMonth() < 9
          ? "0" + (now.getMonth() + 1)
          : now.getMonth() + 1}-${now.getDate() < 10
          ? "0" + now.getDate()
          : now.getDate()}`,
        category: this.state.categories[0],
      }
    }, this.pushToHistory);
  }

  parseExpense(value, index) {
    return {
      id: `Expenses!A${index + 2}`,
      date: value[0],
      description: value[1],
      category: value[2],
      amount: value[3].replace(",", "")
    };
  }

  formatExpense(expense) {
    return [
      `=DATE(${expense.date.substr(0, 4)}, ${expense.date.substr(
        5,
        2
      )}, ${expense.date.substr(-2)})`,
      expense.description,
      expense.category,
      expense.amount
    ];
  }

  append(expense) {
    return window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "Expenses!A1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      values: [this.formatExpense(expense)]
    });
  }

  update(expense) {
    return window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: expense.id,
      valueInputOption: "USER_ENTERED",
      values: [this.formatExpense(expense)]
    });
  }

  load() {
    window.gapi.client.sheets.spreadsheets.values
      .batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: [
          "Data!A2:A50",
          "Expenses!A2:D",
          "Current!H1",
          "Previous!H1"
        ]
      })
      .then(response => {
        const categories = response.result.valueRanges[0].values.map(
          items => items[0]
        );
        this.setState({
          categories: categories,
          expenses: (response.result.valueRanges[1].values || [])
            .map(this.parseExpense)
            .reverse()
            .slice(0, 30),
          processing: false,
          currentMonth: response.result.valueRanges[2].values[0][0],
          previousMonth: response.result.valueRanges[3].values[0][0]
        }, () => {
            window.history.replaceState(this.state, null, "");
        });
      });
  }

  render() {
    return (
      <div>
        <header className="mdc-toolbar mdc-toolbar--fixed">
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <span className="mdc-toolbar__title">Expenses</span>
            </section>
            <section
              className="mdc-toolbar__section mdc-toolbar__section--align-end"
              role="toolbar"
            >
              {this.state.signedIn === false &&
                <span
                  className="material-icons mdc-toolbar__icon"
                  aria-label="Sign in"
                  alt="Sign in"
                  onClick={e => {
                    e.preventDefault();
                    window.gapi.auth2.getAuthInstance().signIn();
                  }}
                >
                  perm_identity
                </span>}
              {this.state.signedIn &&
                <span
                  className="material-icons mdc-toolbar__icon"
                  aria-label="Sign out"
                  alt="Sign out"
                  onClick={e => {
                    e.preventDefault();
                    window.gapi.auth2.getAuthInstance().signOut();
                  }}
                >
                  exit_to_app
                </span>}
            </section>
          </div>
        </header>
        <div className="toolbar-adjusted-content">
          {this.state.signedIn === undefined && <LoadingBar />}
          {this.state.signedIn === false &&
            <div className="center">
              <button
                className="mdc-button sign-in"
                aria-label="Sign in"
                onClick={() => {
                  window.gapi.auth2.getAuthInstance().signIn();
                }}
              >
                Sign In
              </button>
            </div>}
          {this.state.signedIn && this.renderBody()}
        </div>
        <div
          ref={el => {
            if (el) {
              this.snackbar = new MDCSnackbar(el);
            }
          }}
          className="mdc-snackbar"
          aria-live="assertive"
          aria-atomic="true"
          aria-hidden="true"
        >
          <div className="mdc-snackbar__text" />
          <div className="mdc-snackbar__action-wrapper">
            <button
              type="button"
              className="mdc-button mdc-snackbar__action-button"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    );
  }

  renderBody() {
    if (this.state.processing) return <LoadingBar />;
    else
      return (
        <div className="content">
          {this.renderExpenses()}
        </div>
      );
  }

  renderExpenses() {
    if (this.state.showExpenseForm)
      return (
        <ExpenseForm
          categories={this.state.categories}
          expense={this.state.expense}
          onSubmit={this.handleExpenseSubmit}
          onCancel={this.handleExpenseCancel}
          onDelete={this.handleExpenseDelete}
          onChange={this.handleExpenseChange}
        />
      );
    else
      return (
        <div>
          <div className="mdc-card">
            <section className="mdc-card__primary">
              <h2 className="mdc-card__subtitle">This month you've spent:</h2>
              <h1 className="mdc-card__title mdc-card__title--large center">
                {this.state.currentMonth}
              </h1>
            </section>
            <section className="mdc-card__supporting-text">
              Previous month: {this.state.previousMonth}
            </section>
          </div>
          <ExpenseList
            expenses={this.state.expenses}
            onSelect={this.handleExpenseSelect}
          />
          <button
            onClick={() => this.onExpenseNew()}
            className="mdc-fab app-fab--absolute material-icons"
            aria-label="Add expense"
          >
            <span className="mdc-fab__icon">add</span>
          </button>
        </div>
      );
  }
}

export default App;
