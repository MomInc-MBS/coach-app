ALTER TABLE `workouts` ADD COLUMN `performance_snapshot` text;
--> statement-breakpoint
CREATE TRIGGER workouts_performance_immutable BEFORE UPDATE OF performance_snapshot ON workouts
WHEN OLD.completed_at IS NOT NULL AND NEW.performance_snapshot IS NOT OLD.performance_snapshot
BEGIN SELECT RAISE(ABORT,'workout_performance_immutable'); END;
