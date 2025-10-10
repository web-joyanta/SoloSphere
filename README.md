# SoloSphere — Project README

**Live site:** [https://solosphere-f0f15.web.app](https://solosphere-f0f15.web.app)

---

## About
SoloSphere is a full-stack job/gigs marketplace that lets employers post jobs and applicants browse and place bids.  
This README is generated from the project requirements and includes setup and feature details for developer use.

---

## Features
• Responsive UI with consistent navbar and footer (except 404 page).  
• Authentication: Registration (Name, Email, Password, PhotoURL) and Login (Email/Password) with Google sign-in option.  
• Home page with banner/carousel, Browse-by-Category tabs (React-tabs) showing at least 4 job cards per category.  
• Job details page with 'Place A Bid' form (price, deadline, emails read-only), prevents owners bidding their own jobs.  
• Add Job form (employer email read-only, title, deadline, description, category dropdown, min/max price).  
• My Posted Jobs (table with update/delete, confirmation before delete, only shows user's jobs).  
• My Bids (table with status workflow: Pending → Rejected / In Progress → Complete).  
• Bid Requests (job owner can accept/reject bids).  
• 404 page without navbar/footer and a 'Back to Home' button.  
• CORS / Environment variables: hide Firebase and MongoDB credentials; configure server CORS origins.  

---

## Tech Stack
• Frontend: React (Vite) + Tailwind CSS + DaisyUI  
• Tabs: react-tabs (required for Browse By Category)  
• Backend: Node.js + Express  
• Database: MongoDB (Atlas)  
• Auth: Firebase Auth or custom JWT  
• Hosting: Vercel (frontend) and optional backend hosting on Vercel/Render  

---
