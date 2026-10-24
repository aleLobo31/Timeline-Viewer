-- Covers used to be filled automatically with the first event image of a timeline.
-- A cover is now an explicit, optional choice of the guide, so the derived ones are cleared.
UPDATE "Material" SET "coverImage" = NULL WHERE "type" = 'TIMELINE';
