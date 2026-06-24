# 🍽️ Restaurant POS System

A modern full-stack Restaurant POS (Point of Sale) Management System built using the MERN Stack (MongoDB, Express.js, React.js, Node.js).

This application helps restaurants efficiently manage menu items, billing, taxation, cashier operations, bill revisions, discount management, and sales tracking through a modern and user-friendly interface.

---

## 🚀 Features

### 🔐 Authentication & Authorization

* Admin Login
* Cashier Login
* JWT Authentication
* Protected Routes
* Role-Based Access Control

---

## 👨‍💼 Admin Panel

### 📊 Dashboard

* Daily Sales Analytics
* Weekly Sales Analytics
* Monthly Sales Reports
* Revenue Tracking
* Order Statistics
* Item Sales Overview

### 🍔 Category Management

* Create Categories
* Edit Categories
* Delete Categories

### 🍕 Menu Management

* Add Menu Items
* Update Menu Items
* Delete Menu Items
* Manage Prices

### 💰 Tax Management

* GST Configuration
* Service Tax Configuration
* Dynamic Tax Updates

### 👥 User Management

* Create Cashiers
* Manage Staff Accounts
* Role-Based Permissions

---

## 👨‍🍳 Cashier Panel

### 🛒 POS Billing System

* Add Items to Cart
* Update Quantities
* Remove Items
* Table Number Management
* Multiple Payment Methods

### 💳 Payment Methods

* Cash
* Card

### 🧾 Smart Billing

* Automatic Tax Calculation
* Automatic Service Tax Calculation
* Real-Time Bill Summary
* Grand Total Calculation

### 🎁 Discount System

* Percentage Discount
* Fixed Amount Discount
* Automatic Discount Calculation
* Grand Total Recalculation
* Discount Validation

### 🔄 Bill Revision System

* Edit Existing Bills
* Reprint Bills
* Bill Version Tracking
* Parent Bill Reference
* Void Old Bills Before Revision

### 🗑️ Bill Void System

* Void Incorrect Bills
* Preserve Bill History
* Audit-Friendly Records

---

## 🖨️ Receipt Printing

* Thermal Printer Friendly Layout
* Auto Print Support
* Professional POS Receipt Design
* Detailed Item Breakdown
* Tax & Discount Breakdown
* Grand Total Display

---

## 📄 Bill Management

* View All Bills
* Search Bills
* Filter Bills
* View Single Bill
* Bill History
* Bill Status Tracking

---

## 📈 Reporting & Analytics

* Revenue Reports
* Sales Reports
* Order Tracking
* Bill Statistics
* Performance Insights

---

## 🧠 Technologies Used

### Frontend

* React.js
* React Router DOM
* Tailwind CSS
* Axios
* React Hot Toast

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication

### Database

* MongoDB Atlas / MongoDB Compass

### Printing & Reporting

* jsPDF
* jspdf-autotable

---

## 📂 Project Structure

Restaurant-POS-main

├── backend

│ ├── controllers

│ ├── models

│ ├── routes

│ ├── middleware

│ ├── utils

│ └── server.js

│

├── frontend

│ ├── src

│ ├── pages

│ ├── components

│ ├── services

│ └── App.jsx

│

├── README.md

└── .gitignore

---

## ⚙️ Environment Variables

Create a `.env` file inside the backend folder.

```env
PORT=5000

MONGO_URI=YOUR_MONGODB_CONNECTION_STRING

JWT_SECRET=YOUR_SECRET_KEY
```

## 📦 Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/restaurant-pos-system.git
```

### Backend Setup

```bash
cd backend

npm install

npm run dev
```

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

## 🌟 Key Highlights

* MERN Stack Architecture
* Role-Based Authentication
* Dynamic Tax Management
* Discount Management System
* Bill Revision & Reprinting
* Void Bill Support
* Thermal Receipt Printing
* Responsive UI
* Professional POS Workflow
* Scalable Backend Structure

## 📜 License

This project is developed for educational and commercial restaurant management purposes.

## 👨‍💻 Developed By

Shoaib Akhter

Restaurant POS Management System
MERN Stack Application


```bash
git clone https://github.com/your-username/your-repo-name.git