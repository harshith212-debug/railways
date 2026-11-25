# Rail Yatra — Indian Railways Super-App

A full-stack Indian Railways Super-App built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL** (with automatic in-memory + `localStorage` fallback).

## Features
- **IRCTC Reserved Ticketing:** 100+ Indian Railway stations across all 18 zones, 20 listed trains (Vande Bharat, Rajdhani, Shatabdi, Superfast, Mail/Express), Tatkal (+30%), Master Passenger auto-fill, and consecutive berth allocation.
- **UTS & Platform QR:** Paperless QR passes with 3% R-Wallet discount and live `MM:SS` countdown timer.
- **PNR Status & PDF E-Ticket (ERS):** Live PNR lookup, selective passenger cancellation with automatic RAC promotion, and A4 PDF E-Ticket preview & print.
- **Live Train Status (NTES):** Station-by-station route timeline, delay tracking, GPS coordinates, and interactive next-stop simulation.
- **Coach Position & Seat Map:** Scrollable rake diagram (`ENG` to `SLR`) with interactive compartment berth layouts (`LB/MB/UB/SL/SU/WS`).
- **R-Wallet & Multiple Payment Options:** R-Wallet, BHIM UPI, Credit/Debit/RuPay Card, NetBanking, and IRCTC iPay (Pay Later).
- **E-Catering & Rail Madad (139):** Berth-side meal ordering and PNR-linked grievance tracking.
- **Auth & Per-Page Loaders:** Sign In (`/login`), Sign Up (`/signup`), and dedicated loading skeletons for every page/module.

## Quick Start
```bash
npm install
npx prisma generate
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).
