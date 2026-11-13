-- Renombrado de la app: claves foráneas e índices con el prefijo brio_.

-- DropForeignKey
ALTER TABLE `brio_activity_session` DROP FOREIGN KEY `ritmo_activity_session_activity_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_activity_session` DROP FOREIGN KEY `ritmo_activity_session_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_activity_type` DROP FOREIGN KEY `ritmo_activity_type_owner_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_body_measurement` DROP FOREIGN KEY `ritmo_body_measurement_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_challenge` DROP FOREIGN KEY `ritmo_challenge_owner_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_challenge_member` DROP FOREIGN KEY `ritmo_challenge_member_challenge_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_challenge_member` DROP FOREIGN KEY `ritmo_challenge_member_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_cheer` DROP FOREIGN KEY `ritmo_cheer_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_connection_prefs` DROP FOREIGN KEY `ritmo_connection_prefs_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_daily_health` DROP FOREIGN KEY `ritmo_daily_health_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_daily_log` DROP FOREIGN KEY `ritmo_daily_log_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_exercise` DROP FOREIGN KEY `ritmo_exercise_owner_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_exercise_muscle` DROP FOREIGN KEY `ritmo_exercise_muscle_exercise_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_exercise_muscle_override` DROP FOREIGN KEY `ritmo_exercise_muscle_override_exercise_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_exercise_muscle_override` DROP FOREIGN KEY `ritmo_exercise_muscle_override_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_follow` DROP FOREIGN KEY `ritmo_follow_followee_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_follow` DROP FOREIGN KEY `ritmo_follow_follower_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_food` DROP FOREIGN KEY `ritmo_food_owner_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_food_serving` DROP FOREIGN KEY `ritmo_food_serving_food_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_garmin_connection` DROP FOREIGN KEY `ritmo_garmin_connection_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_heart_config` DROP FOREIGN KEY `ritmo_heart_config_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_hevy_connection` DROP FOREIGN KEY `ritmo_hevy_connection_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_hevy_exercise_link` DROP FOREIGN KEY `ritmo_hevy_exercise_link_exercise_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_hevy_exercise_link` DROP FOREIGN KEY `ritmo_hevy_exercise_link_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_meal_entry` DROP FOREIGN KEY `ritmo_meal_entry_food_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_meal_entry` DROP FOREIGN KEY `ritmo_meal_entry_serving_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_meal_entry` DROP FOREIGN KEY `ritmo_meal_entry_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_menu_choice` DROP FOREIGN KEY `ritmo_menu_choice_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_performance_measurement` DROP FOREIGN KEY `ritmo_performance_measurement_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_plan` DROP FOREIGN KEY `ritmo_plan_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_planned_session` DROP FOREIGN KEY `ritmo_planned_session_completed_session_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_planned_session` DROP FOREIGN KEY `ritmo_planned_session_plan_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_planned_session` DROP FOREIGN KEY `ritmo_planned_session_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_profile` DROP FOREIGN KEY `ritmo_profile_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_recommendation_state` DROP FOREIGN KEY `ritmo_recommendation_state_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_shopping_check` DROP FOREIGN KEY `ritmo_shopping_check_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_social_profile` DROP FOREIGN KEY `ritmo_social_profile_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_strength_set` DROP FOREIGN KEY `ritmo_strength_set_exercise_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_strength_set` DROP FOREIGN KEY `ritmo_strength_set_session_id_fkey`;

-- DropForeignKey
ALTER TABLE `brio_strength_set` DROP FOREIGN KEY `ritmo_strength_set_user_id_fkey`;

-- AddForeignKey
ALTER TABLE `brio_profile` ADD CONSTRAINT `brio_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_body_measurement` ADD CONSTRAINT `brio_body_measurement_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_activity_type` ADD CONSTRAINT `brio_activity_type_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_activity_session` ADD CONSTRAINT `brio_activity_session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_activity_session` ADD CONSTRAINT `brio_activity_session_activity_type_id_fkey` FOREIGN KEY (`activity_type_id`) REFERENCES `brio_activity_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_food` ADD CONSTRAINT `brio_food_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_food_serving` ADD CONSTRAINT `brio_food_serving_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `brio_food`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_meal_entry` ADD CONSTRAINT `brio_meal_entry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_meal_entry` ADD CONSTRAINT `brio_meal_entry_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `brio_food`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_meal_entry` ADD CONSTRAINT `brio_meal_entry_serving_id_fkey` FOREIGN KEY (`serving_id`) REFERENCES `brio_food_serving`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_daily_log` ADD CONSTRAINT `brio_daily_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_exercise` ADD CONSTRAINT `brio_exercise_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_exercise_muscle` ADD CONSTRAINT `brio_exercise_muscle_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `brio_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_strength_set` ADD CONSTRAINT `brio_strength_set_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `brio_activity_session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_strength_set` ADD CONSTRAINT `brio_strength_set_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_strength_set` ADD CONSTRAINT `brio_strength_set_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `brio_exercise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_heart_config` ADD CONSTRAINT `brio_heart_config_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_performance_measurement` ADD CONSTRAINT `brio_performance_measurement_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_recommendation_state` ADD CONSTRAINT `brio_recommendation_state_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_exercise_muscle_override` ADD CONSTRAINT `brio_exercise_muscle_override_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_exercise_muscle_override` ADD CONSTRAINT `brio_exercise_muscle_override_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `brio_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_plan` ADD CONSTRAINT `brio_plan_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_planned_session` ADD CONSTRAINT `brio_planned_session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_planned_session` ADD CONSTRAINT `brio_planned_session_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `brio_plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_planned_session` ADD CONSTRAINT `brio_planned_session_completed_session_id_fkey` FOREIGN KEY (`completed_session_id`) REFERENCES `brio_activity_session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_hevy_connection` ADD CONSTRAINT `brio_hevy_connection_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_hevy_exercise_link` ADD CONSTRAINT `brio_hevy_exercise_link_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_hevy_exercise_link` ADD CONSTRAINT `brio_hevy_exercise_link_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `brio_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_garmin_connection` ADD CONSTRAINT `brio_garmin_connection_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_daily_health` ADD CONSTRAINT `brio_daily_health_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_menu_choice` ADD CONSTRAINT `brio_menu_choice_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_shopping_check` ADD CONSTRAINT `brio_shopping_check_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_connection_prefs` ADD CONSTRAINT `brio_connection_prefs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_social_profile` ADD CONSTRAINT `brio_social_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_follow` ADD CONSTRAINT `brio_follow_follower_id_fkey` FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_follow` ADD CONSTRAINT `brio_follow_followee_id_fkey` FOREIGN KEY (`followee_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_cheer` ADD CONSTRAINT `brio_cheer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_challenge` ADD CONSTRAINT `brio_challenge_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_challenge_member` ADD CONSTRAINT `brio_challenge_member_challenge_id_fkey` FOREIGN KEY (`challenge_id`) REFERENCES `brio_challenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_challenge_member` ADD CONSTRAINT `brio_challenge_member_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `brio_activity_session` RENAME INDEX `ritmo_activity_session_activity_type_id_idx` TO `brio_activity_session_activity_type_id_idx`;

-- RenameIndex
ALTER TABLE `brio_activity_session` RENAME INDEX `ritmo_activity_session_source_external_id_key` TO `brio_activity_session_source_external_id_key`;

-- RenameIndex
ALTER TABLE `brio_activity_session` RENAME INDEX `ritmo_activity_session_user_id_logged_on_idx` TO `brio_activity_session_user_id_logged_on_idx`;

-- RenameIndex
ALTER TABLE `brio_activity_type` RENAME INDEX `ritmo_activity_type_code_key` TO `brio_activity_type_code_key`;

-- RenameIndex
ALTER TABLE `brio_activity_type` RENAME INDEX `ritmo_activity_type_owner_user_id_idx` TO `brio_activity_type_owner_user_id_idx`;

-- RenameIndex
ALTER TABLE `brio_body_measurement` RENAME INDEX `ritmo_body_measurement_user_id_measured_on_idx` TO `brio_body_measurement_user_id_measured_on_idx`;

-- RenameIndex
ALTER TABLE `brio_body_measurement` RENAME INDEX `ritmo_body_measurement_user_id_measured_on_key` TO `brio_body_measurement_user_id_measured_on_key`;

-- RenameIndex
ALTER TABLE `brio_challenge` RENAME INDEX `ritmo_challenge_end_day_idx` TO `brio_challenge_end_day_idx`;

-- RenameIndex
ALTER TABLE `brio_challenge_member` RENAME INDEX `ritmo_challenge_member_user_id_idx` TO `brio_challenge_member_user_id_idx`;

-- RenameIndex
ALTER TABLE `brio_cheer` RENAME INDEX `ritmo_cheer_target_key_idx` TO `brio_cheer_target_key_idx`;

-- RenameIndex
ALTER TABLE `brio_daily_log` RENAME INDEX `ritmo_daily_log_user_id_log_date_idx` TO `brio_daily_log_user_id_log_date_idx`;

-- RenameIndex
ALTER TABLE `brio_daily_log` RENAME INDEX `ritmo_daily_log_user_id_log_date_key` TO `brio_daily_log_user_id_log_date_key`;

-- RenameIndex
ALTER TABLE `brio_exercise` RENAME INDEX `ritmo_exercise_code_key` TO `brio_exercise_code_key`;

-- RenameIndex
ALTER TABLE `brio_exercise` RENAME INDEX `ritmo_exercise_owner_user_id_idx` TO `brio_exercise_owner_user_id_idx`;

-- RenameIndex
ALTER TABLE `brio_follow` RENAME INDEX `ritmo_follow_followee_id_idx` TO `brio_follow_followee_id_idx`;

-- RenameIndex
ALTER TABLE `brio_food` RENAME INDEX `ritmo_food_barcode_key` TO `brio_food_barcode_key`;

-- RenameIndex
ALTER TABLE `brio_food` RENAME INDEX `ritmo_food_name_idx` TO `brio_food_name_idx`;

-- RenameIndex
ALTER TABLE `brio_food` RENAME INDEX `ritmo_food_owner_user_id_idx` TO `brio_food_owner_user_id_idx`;

-- RenameIndex
ALTER TABLE `brio_food_serving` RENAME INDEX `ritmo_food_serving_food_id_label_key` TO `brio_food_serving_food_id_label_key`;

-- RenameIndex
ALTER TABLE `brio_heart_config` RENAME INDEX `ritmo_heart_config_user_id_key` TO `brio_heart_config_user_id_key`;

-- RenameIndex
ALTER TABLE `brio_hevy_exercise_link` RENAME INDEX `ritmo_hevy_exercise_link_user_id_exercise_id_idx` TO `brio_hevy_exercise_link_user_id_exercise_id_idx`;

-- RenameIndex
ALTER TABLE `brio_meal_entry` RENAME INDEX `ritmo_meal_entry_food_id_idx` TO `brio_meal_entry_food_id_idx`;

-- RenameIndex
ALTER TABLE `brio_meal_entry` RENAME INDEX `ritmo_meal_entry_serving_id_idx` TO `brio_meal_entry_serving_id_idx`;

-- RenameIndex
ALTER TABLE `brio_meal_entry` RENAME INDEX `ritmo_meal_entry_user_id_logged_on_idx` TO `brio_meal_entry_user_id_logged_on_idx`;

-- RenameIndex
ALTER TABLE `brio_performance_measurement` RENAME INDEX `ritmo_performance_measurement_user_id_metric_measured_on_idx` TO `brio_performance_measurement_user_id_metric_measured_on_idx`;

-- RenameIndex
ALTER TABLE `brio_plan` RENAME INDEX `ritmo_plan_user_id_is_active_idx` TO `brio_plan_user_id_is_active_idx`;

-- RenameIndex
ALTER TABLE `brio_planned_session` RENAME INDEX `ritmo_planned_session_completed_session_id_idx` TO `brio_planned_session_completed_session_id_idx`;

-- RenameIndex
ALTER TABLE `brio_planned_session` RENAME INDEX `ritmo_planned_session_plan_id_idx` TO `brio_planned_session_plan_id_idx`;

-- RenameIndex
ALTER TABLE `brio_planned_session` RENAME INDEX `ritmo_planned_session_user_id_day_key` TO `brio_planned_session_user_id_day_key`;

-- RenameIndex
ALTER TABLE `brio_profile` RENAME INDEX `ritmo_profile_user_id_key` TO `brio_profile_user_id_key`;

-- RenameIndex
ALTER TABLE `brio_recommendation_state` RENAME INDEX `ritmo_recommendation_state_user_id_key_key` TO `brio_recommendation_state_user_id_key_key`;

-- RenameIndex
ALTER TABLE `brio_social_profile` RENAME INDEX `ritmo_social_profile_handle_key` TO `brio_social_profile_handle_key`;

-- RenameIndex
ALTER TABLE `brio_strength_set` RENAME INDEX `ritmo_strength_set_session_id_idx` TO `brio_strength_set_session_id_idx`;

-- RenameIndex
ALTER TABLE `brio_strength_set` RENAME INDEX `ritmo_strength_set_user_id_exercise_id_idx` TO `brio_strength_set_user_id_exercise_id_idx`;

