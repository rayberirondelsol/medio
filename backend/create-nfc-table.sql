-- Create NFC Chips table
CREATE TABLE IF NOT EXISTS nfc_chips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chip_uid VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index on user_id for efficient chip listing
CREATE INDEX IF NOT EXISTS idx_nfc_chips_user_id ON nfc_chips(user_id);

-- Verify chip_uid UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nfc_chips_chip_uid_key'
  ) THEN
    ALTER TABLE nfc_chips ADD CONSTRAINT nfc_chips_chip_uid_key UNIQUE (chip_uid);
    RAISE NOTICE 'Added UNIQUE constraint on nfc_chips.chip_uid';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on nfc_chips.chip_uid already exists';
  END IF;
END $$;
