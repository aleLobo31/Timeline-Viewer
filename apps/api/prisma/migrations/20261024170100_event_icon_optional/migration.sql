-- An event may have no icon: only the "icon IS NOT NULL" requirement of events is dropped.
ALTER TABLE "TimelineItem" DROP CONSTRAINT "TimelineItem_kind_fields_chk";

ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_kind_fields_chk" CHECK (
  (
    "kind" = 'EVENT'
    AND "endYear" IS NULL
    AND "color" IS NULL
    AND (("day" IS NULL) = ("month" IS NULL))
  ) OR (
    "kind" IN ('PROCESS', 'PERIOD')
    AND "endYear" IS NOT NULL
    AND "endYear" >= "startYear"
    AND "color" IS NOT NULL
    AND "icon" IS NULL
    AND "day" IS NULL
    AND "month" IS NULL
  )
);
