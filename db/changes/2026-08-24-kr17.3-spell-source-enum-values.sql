-- KR17.3: exact 5etools source codes for the missing 2014 spell corpus.
-- AI already exists. BMT, IDRotF and GGR use the established BOMT, IDROTF and GGTR values.

ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'SCC';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'LLK';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'AAG';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'SatO';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'AitFR-AVT';
