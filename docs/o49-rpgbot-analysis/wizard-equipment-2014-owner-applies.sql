BEGIN;

DELETE FROM public.class_starting_equipment_option AS equipment
USING public.class AS caster, public.weapon AS weapon
WHERE equipment.class_id = caster.class_id
  AND equipment.weapon_id = weapon.weapon_id
  AND caster.eng_name::text = 'WIZARD_2014'
  AND caster.ruleset = 'RULES_2014'
  AND weapon.name::text = 'DAGGER'
  AND weapon.ruleset = 'RULES_2014'
  AND equipment.ruleset = 'RULES_2014'
  AND equipment.choice_group = 4
  AND equipment.option = 'a'
  AND equipment.seed_index = 85
  AND equipment.quantity = 1;

COMMIT;
