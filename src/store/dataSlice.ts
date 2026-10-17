import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Office, Department, PhoneEntry } from '@/types/phone';

export interface DataState {
  offices: Office[];
  depts: Department[];
  entries: PhoneEntry[];
  hydrated: boolean;
  syncing: boolean;
}

const initialState: DataState = {
  offices: [],
  depts: [],
  entries: [],
  hydrated: false,
  syncing: false,
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setData(state, action: PayloadAction<{ offices: Office[]; depts: Department[]; entries: PhoneEntry[] }>) {
      state.offices = action.payload.offices;
      state.depts = action.payload.depts;
      state.entries = action.payload.entries;
      state.hydrated = true;
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.syncing = action.payload;
    },
  },
});

export const { setData, setHydrated, setSyncing } = dataSlice.actions;
export default dataSlice.reducer;
