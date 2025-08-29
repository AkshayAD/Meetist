import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Meeting } from '../../types';
import StorageService from '../../services/StorageService';

interface MeetingsState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: MeetingsState = {
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  error: null,
  searchQuery: '',
};

// Async thunks
export const loadMeetings = createAsyncThunk(
  'meetings/loadAll',
  async () => {
    return await StorageService.getAllMeetings();
  }
);

export const loadMeeting = createAsyncThunk(
  'meetings/loadOne',
  async (id: string) => {
    return await StorageService.getMeeting(id);
  }
);

export const saveMeeting = createAsyncThunk(
  'meetings/save',
  async (meeting: Meeting) => {
    await StorageService.saveMeeting(meeting);
    return meeting;
  }
);

export const deleteMeeting = createAsyncThunk(
  'meetings/delete',
  async (id: string) => {
    await StorageService.deleteMeeting(id);
    return id;
  }
);

export const searchMeetings = createAsyncThunk(
  'meetings/search',
  async (query: string) => {
    return await StorageService.searchMeetings(query);
  }
);

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load all meetings
    builder
      .addCase(loadMeetings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMeetings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.meetings = action.payload;
      })
      .addCase(loadMeetings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load meetings';
      });

    // Load single meeting
    builder
      .addCase(loadMeeting.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMeeting.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMeeting = action.payload;
      })
      .addCase(loadMeeting.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load meeting';
      });

    // Save meeting
    builder
      .addCase(saveMeeting.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveMeeting.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.meetings.findIndex(m => m.id === action.payload.id);
        if (index >= 0) {
          state.meetings[index] = action.payload;
        } else {
          state.meetings.unshift(action.payload);
        }
      })
      .addCase(saveMeeting.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to save meeting';
      });

    // Delete meeting
    builder
      .addCase(deleteMeeting.fulfilled, (state, action) => {
        state.meetings = state.meetings.filter(m => m.id !== action.payload);
        if (state.currentMeeting?.id === action.payload) {
          state.currentMeeting = null;
        }
      });

    // Search meetings
    builder
      .addCase(searchMeetings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchMeetings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.meetings = action.payload;
      });
  },
});

export const { setSearchQuery, clearError } = meetingsSlice.actions;
export default meetingsSlice.reducer;