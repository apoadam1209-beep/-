// Global tuning constants for XENO RUN.

export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.35;
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];

export const TRACK_WIDTH = 11.5;
export const TILE_LENGTH = 24;
export const TILE_COUNT = 14;
export const CEILING_Y = 7.4; // inverted-gravity running plane

export const START_SPEED = 17.5;
export const MAX_SPEED = 47;
export const SPEED_RAMP = 0.42; // units/s added per second of running

export const GRAVITY = 62;
export const JUMP_VELOCITY = 17.2;
export const DOUBLE_JUMP_VELOCITY = 14.4;
export const SLIDE_TIME = 0.72;
export const LANE_CHANGE_SPEED = 12.5;

export const PLAYER_WIDTH = 0.95;
export const PLAYER_HEIGHT = 1.75;
export const PLAYER_SLIDE_HEIGHT = 0.85;
export const PLAYER_DEPTH = 0.9;

export const MAX_INTEGRITY = 3;
export const INVULN_TIME = 1.6;

export const OVERDRIVE_MAX = 100;
export const OVERDRIVE_TIME = 8.5;
export const OVERDRIVE_GAIN_PER_ORB = 4.2;

export const CLOSE_CALL_MARGIN = 0.55;
export const CLOSE_CALL_POINTS = 60;

export const PHASE_COLORS = [0x2ff5ff, 0xff3ea5];
export const PHASE_NAMES = ['CYAN', 'MAGENTA'];

export const BIOME_LENGTH = 1150; // metres per biome before the warp gate
export const SPAWN_AHEAD = 260;

export const HUNTER_START_DIST = 46;
export const HUNTER_MIN_DIST = 6;
export const HUNTER_HIT_PENALTY = 11;
export const HUNTER_RECOVER = 1.5; // metres of gap recovered per second
