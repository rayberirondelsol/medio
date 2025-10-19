# Quickstart Guide: NFC Chip Registration

**Feature**: NFC Chip Registration
**Branch**: 005-specify-scripts-bash
**Target Audience**: Developers implementing this feature

## Overview

This guide helps you quickly set up and start implementing the NFC Chip Registration feature, which enables parents to register NFC chips for their children via manual entry or NFC scanning.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Docker & Docker Compose (for containerized development)
- NFC-capable Android device with Chrome 89+ (for testing NFC scan feature)

## Quick Setup

### 1. Clone and Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Database Setup

The database schema already includes NFC chip tables:

```sql
-- Table: nfc_chips (already exists in database)
CREATE TABLE nfc_chips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chip_uid VARCHAR(255) UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: video_nfc_mappings (already exists, includes cascade)
CREATE TABLE video_nfc_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id),
  nfc_chip_id UUID NOT NULL REFERENCES nfc_chips(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  max_watch_time_minutes INTEGER,
  is_active BOOLEAN DEFAULT true
);
```

**Verify Schema**:
```bash
psql $DATABASE_URL -c "\d nfc_chips"
psql $DATABASE_URL -c "\d video_nfc_mappings"
```

### 3. Environment Variables

**Backend** (`backend/.env`):
```env
# Existing variables (no changes needed)
DATABASE_URL=postgresql://user:pass@localhost:5432/medio
JWT_SECRET=your-secret-key
SENTRY_DSN=your-sentry-dsn

# CSRF protection (should already exist)
CSRF_SECRET=your-csrf-secret
```

**Frontend** (`frontend/.env`):
```env
# Existing variables (no changes needed)
REACT_APP_API_URL=http://localhost:5000
```

### 4. Start Development Servers

**Using Docker** (recommended):
```bash
make dev
```

**Manual start**:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

## Development Workflow

### Step 1: Write Tests First (TDD)

Following the constitution's **Test-First Development** principle, write tests BEFORE implementation:

**Backend Tests** (`backend/tests/integration/nfc.test.js`):
```javascript
describe('POST /api/nfc/chips', () => {
  it('should register a new chip with valid data', async () => {
    const res = await request(app)
      .post('/api/nfc/chips')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        chip_uid: '04:5A:B2:C3:D4:E5:F6',
        label: "Ben's Chip"
      });

    expect(res.status).toBe(201);
    expect(res.body.chip_uid).toBe('04:5A:B2:C3:D4:E5:F6');
  });

  it('should return 409 for duplicate chip_uid', async () => {
    // Register chip
    await registerChip('04:5A:B2:C3:D4:E5:F6', 'Test Chip');

    // Attempt duplicate
    const res = await request(app)
      .post('/api/nfc/chips')
      .set('Cookie', authCookie)
      .send({ chip_uid: '04:5A:B2:C3:D4:E5:F6', label: 'Duplicate' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('NFC chip already registered');
  });
});
```

**Frontend Tests** (`frontend/src/components/nfc/__tests__/ChipRegistrationForm.test.tsx`):
```typescript
describe('ChipRegistrationForm', () => {
  it('should submit valid chip data', async () => {
    render(<ChipRegistrationForm />);

    await userEvent.type(screen.getByLabelText(/chip id/i), '04:5A:B2:C3:D4:E5:F6');
    await userEvent.type(screen.getByLabelText(/label/i), "Ben's Chip");
    await userEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/chip registered successfully/i)).toBeInTheDocument();
    });
  });
});
```

**Run tests** (should FAIL initially - RED phase):
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Step 2: Implement Backend

**Add DELETE endpoint** (`backend/src/routes/nfc.js`):
```javascript
// Delete NFC chip (with cascade to video_nfc_mappings)
router.delete('/chips/:chipId', authenticateToken, async (req, res) => {
  const { chipId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM nfc_chips WHERE id = $1 AND user_id = $2 RETURNING id',
      [chipId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'NFC chip not found' });
    }

    res.json({ message: 'NFC chip deleted successfully' });
  } catch (error) {
    console.error('Error deleting NFC chip:', error);
    res.status(500).json({ message: 'Failed to delete NFC chip' });
  }
});
```

**Add chip count validation** (modify POST endpoint):
```javascript
// Before INSERT in POST /api/nfc/chips
const chipCount = await pool.query(
  'SELECT COUNT(*) FROM nfc_chips WHERE user_id = $1',
  [req.user.id]
);

if (parseInt(chipCount.rows[0].count) >= 20) {
  return res.status(403).json({
    message: 'Maximum chip limit reached (20 chips)'
  });
}
```

**Add rate limiting** (`backend/src/server.js`):
```javascript
const nfcChipMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many chip registration attempts',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

app.use('/api/nfc/chips', (req, res, next) => {
  if (req.method === 'POST') {
    return nfcChipMutationLimiter(req, res, next);
  }
  next();
});
```

### Step 3: Implement Frontend

**Create NFC service** (`frontend/src/services/nfcService.ts`):
```typescript
import axios from 'axios';
import { NFCChip } from '../types/nfc';

const API_URL = process.env.REACT_APP_API_URL;

export const nfcService = {
  async getChips(): Promise<NFCChip[]> {
    const res = await axios.get(`${API_URL}/api/nfc/chips`);
    return res.data;
  },

  async registerChip(chip_uid: string, label: string): Promise<NFCChip> {
    const res = await axios.post(`${API_URL}/api/nfc/chips`, {
      chip_uid,
      label
    });
    return res.data;
  },

  async deleteChip(chipId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/nfc/chips/${chipId}`);
  }
};
```

**Create React Context** (`frontend/src/context/NFCChipContext.tsx`):
```typescript
import React, { createContext, useContext, useState } from 'react';
import { nfcService } from '../services/nfcService';
import { NFCChip } from '../types/nfc';

interface NFCChipContextType {
  chips: NFCChip[];
  loading: boolean;
  error: string | null;
  fetchChips: () => Promise<void>;
  registerChip: (chip_uid: string, label: string) => Promise<NFCChip>;
  deleteChip: (chipId: string) => Promise<void>;
}

const NFCChipContext = createContext<NFCChipContextType | undefined>(undefined);

export const NFCChipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chips, setChips] = useState<NFCChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChips = async () => {
    setLoading(true);
    try {
      const data = await nfcService.getChips();
      setChips(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch chips');
    } finally {
      setLoading(false);
    }
  };

  const registerChip = async (chip_uid: string, label: string) => {
    const newChip = await nfcService.registerChip(chip_uid, label);
    setChips([newChip, ...chips]);
    return newChip;
  };

  const deleteChip = async (chipId: string) => {
    await nfcService.deleteChip(chipId);
    setChips(chips.filter(c => c.id !== chipId));
  };

  return (
    <NFCChipContext.Provider value={{ chips, loading, error, fetchChips, registerChip, deleteChip }}>
      {children}
    </NFCChipContext.Provider>
  );
};

export const useNFCChips = () => {
  const context = useContext(NFCChipContext);
  if (!context) throw new Error('useNFCChips must be used within NFCChipProvider');
  return context;
};
```

**Create NFC Scanner** (`frontend/src/utils/nfcScanner.ts`):
```typescript
export interface NFCScanResult {
  success: boolean;
  chip_uid?: string;
  errorCode?: 'PERMISSION_DENIED' | 'NFC_DISABLED' | 'INVALID_TAG' | 'SCAN_TIMEOUT' | 'UNSUPPORTED';
  errorMessage?: string;
}

export const isNFCSupported = (): boolean => {
  return 'NDEFReader' in window;
};

export const scanNFCChip = async (): Promise<NFCScanResult> => {
  if (!isNFCSupported()) {
    return {
      success: false,
      errorCode: 'UNSUPPORTED',
      errorMessage: 'NFC not supported on this device'
    };
  }

  const ndef = new NDEFReader();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    await ndef.scan({ signal: controller.signal });

    return new Promise((resolve) => {
      ndef.onreading = (event) => {
        clearTimeout(timeoutId);
        const serialNumber = event.serialNumber;
        resolve({
          success: true,
          chip_uid: serialNumber
        });
      };

      ndef.onreadingerror = () => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          errorCode: 'INVALID_TAG',
          errorMessage: 'Could not read NFC tag'
        });
      };
    });
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'NotAllowedError') {
      return {
        success: false,
        errorCode: 'PERMISSION_DENIED',
        errorMessage: 'NFC permission denied'
      };
    }

    if (error.name === 'NotSupportedError') {
      return {
        success: false,
        errorCode: 'NFC_DISABLED',
        errorMessage: 'NFC is disabled on this device'
      };
    }

    return {
      success: false,
      errorCode: 'INVALID_TAG',
      errorMessage: 'Failed to scan NFC chip'
    };
  }
};
```

### Step 4: Run Tests (GREEN phase)

```bash
# Backend tests should now pass
cd backend && npm test

# Frontend tests should now pass
cd frontend && npm test

# E2E tests
cd tests && npx playwright test nfc-chip-registration.spec.js
```

### Step 5: Refactor (REFACTOR phase)

- Extract common validation logic
- Improve error messages
- Optimize database queries
- Add code comments

## Testing NFC Scan Feature

### On Android Device

1. Enable NFC in device settings
2. Open Chrome browser (version 89+)
3. Navigate to `https://your-app-url.com` (HTTPS required)
4. Grant NFC permissions when prompted
5. Click "Scan NFC Chip" button
6. Hold device near NFC chip
7. Verify chip UID auto-fills in form

### Simulate NFC on Desktop (Testing)

```typescript
// Mock NDEFReader for testing
if (process.env.NODE_ENV === 'development') {
  (window as any).NDEFReader = class MockNDEFReader {
    async scan() {
      // Simulate scan
      setTimeout(() => {
        this.onreading?.({ serialNumber: '04:5A:B2:C3:D4:E5:F6' });
      }, 2000);
    }
    onreading: any;
    onreadingerror: any;
  };
}
```

## Common Issues & Solutions

### Issue: "NFC chip already registered" on first registration
**Solution**: Check if chip was previously registered. Query database:
```sql
SELECT * FROM nfc_chips WHERE chip_uid = '04:5A:B2:C3:D4:E5:F6';
```

### Issue: DELETE endpoint returns 404 even though chip exists
**Solution**: Verify user owns the chip. The endpoint checks `user_id = req.user.id`.

### Issue: Rate limit exceeded during development
**Solution**: Clear rate limit in Redis or restart backend server.

### Issue: NFC scan button not appearing on Chrome Android
**Solution**:
- Verify Chrome version ≥ 89
- Check HTTPS connection (required for Web NFC API)
- Verify feature detection: `console.log('NDEFReader' in window);`

## Performance Monitoring

**Backend Metrics** (Sentry):
```javascript
// Track registration errors
if (error.code === '23505') {
  Sentry.captureMessage('Duplicate chip UID registration attempt', {
    level: 'warning',
    extra: {
      user_id: req.user.id,
      chip_uid_prefix: chip_uid.substring(0, 8) // Don't log full UID
    }
  });
}
```

**Frontend Metrics**:
```typescript
// Track scan success rate
if (scanResult.success) {
  console.log('NFC scan successful', { duration: scanDuration });
} else {
  console.error('NFC scan failed', { errorCode: scanResult.errorCode });
}
```

## Production Deployment Checklist

- [ ] Database migrations applied (verify CASCADE constraints)
- [ ] Rate limiting configured (10 POST, 20 DELETE, 60 GET per 15min)
- [ ] CSRF tokens enabled for POST/DELETE endpoints
- [ ] Sentry error tracking configured
- [ ] HTTPS enforced (required for Web NFC API)
- [ ] E2E tests passing for all 8 scenarios
- [ ] Code coverage ≥ 80%
- [ ] Security review completed (UID enumeration, XSS, timing attacks)

## Next Steps

1. Review [spec.md](./spec.md) for complete requirements
2. Review [data-model.md](./data-model.md) for entity relationships
3. Review [contracts/](./contracts/) for API specifications
4. Run `/speckit.tasks` to generate implementation tasks
5. Follow TDD workflow: Write test → Implement → Refactor

## Resources

- **Web NFC API Specification**: https://w3c.github.io/web-nfc/
- **MDN Web NFC Documentation**: https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
- **PostgreSQL CASCADE Documentation**: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
- **express-rate-limit**: https://www.npmjs.com/package/express-rate-limit
- **Sentry React Integration**: https://docs.sentry.io/platforms/javascript/guides/react/

## Support

For questions or issues:
- Check [research.md](./research.md) for technology decisions and rationale
- Review existing NFC routes in `backend/src/routes/nfc.js`
- Consult project constitution in `.specify/memory/constitution.md`
