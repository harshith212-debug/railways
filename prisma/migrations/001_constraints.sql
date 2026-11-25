-- PostgreSQL Domain & Integrity Constraints for RailOne
-- Run after `prisma db push` or as part of migration pipeline

ALTER TABLE "User"
  ADD CONSTRAINT chk_user_wallet_nonnegative CHECK ("walletBalance" >= 0);

ALTER TABLE "MasterPassenger"
  ADD CONSTRAINT chk_master_passenger_age CHECK ("age" BETWEEN 1 AND 125);

ALTER TABLE "SeatAvailability"
  ADD CONSTRAINT chk_seat_avail_nonnegative CHECK (
    "availableSeats" >= 0 AND "racCount" >= 0 AND "wlCount" >= 0
  );

ALTER TABLE "Booking"
  ADD CONSTRAINT chk_booking_pnr_digits CHECK ("pnr" ~ '^[0-9]{10}$'),
  ADD CONSTRAINT chk_booking_fare_positive CHECK ("totalFare" >= 0);

ALTER TABLE "BookingPassenger"
  ADD CONSTRAINT chk_booking_pax_age CHECK ("age" BETWEEN 1 AND 125);

ALTER TABLE "UtsTicket"
  ADD CONSTRAINT chk_uts_counts CHECK ("adultCount" >= 1 AND "childCount" >= 0),
  ADD CONSTRAINT chk_uts_validity CHECK ("validUntil" > "validFrom");

-- Composite index for fast segment search on TrainRoute
CREATE INDEX IF NOT EXISTS idx_train_route_segment
  ON "TrainRoute" ("trainNumber", "stationCode", "stopSequence");
