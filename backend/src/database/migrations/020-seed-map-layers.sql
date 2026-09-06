-- 003 — the map layer registry.
--
-- One row per layer the interactive map can draw. `owner_module` names the module that
-- supplies the layer's data; geography only declares that the layer exists.
--
-- `is_available` is FALSE for every layer whose owning module is not built yet. The map
-- renders the registry, so an unbuilt layer appears as disabled rather than as a broken
-- toggle or a silently missing feature.

INSERT INTO map_layers
  (layer_key, owner_module, name_en, name_hi, display_order, is_default_visible, is_available)
VALUES
  ('districts',    'geography',  'Districts',            'जिले',              10, TRUE,  TRUE),
  ('alerts',       'alerts',     'Active alerts',        'सक्रिय अलर्ट',       20, FALSE, FALSE),
  ('rainfall',     'hydromet',   'Rainfall',             'वर्षा',             30, FALSE, FALSE),
  ('weather',      'hydromet',   'Weather',              'मौसम',              40, FALSE, FALSE),
  ('rivers',       'hydromet',   'River levels',         'नदी जलस्तर',        50, FALSE, FALSE),
  ('roads',        'roads',      'Road status',          'सड़क स्थिति',        60, FALSE, FALSE),
  ('traffic',      'roads',      'Live traffic',         'लाइव ट्रैफ़िक',      70, FALSE, FALSE),
  ('tourism',      'tourism',    'Tourism load',         'पर्यटन भार',        80, FALSE, FALSE),
  ('health',       'indicators', 'Health facilities',    'स्वास्थ्य सुविधाएं', 90, FALSE, FALSE),
  ('education',    'indicators', 'Educational institutions', 'शैक्षणिक संस्थान', 100, FALSE, FALSE),
  ('connectivity', 'indicators', 'Connectivity',         'कनेक्टिविटी',       110, FALSE, FALSE),
  ('migration',    'migration',  'Migration',            'पलायन',             120, FALSE, FALSE)
ON CONFLICT (layer_key) DO UPDATE SET
  owner_module       = EXCLUDED.owner_module,
  name_en            = EXCLUDED.name_en,
  name_hi            = EXCLUDED.name_hi,
  display_order      = EXCLUDED.display_order,
  is_default_visible = EXCLUDED.is_default_visible,
  is_available       = EXCLUDED.is_available;

-- ROLLBACK
-- DELETE FROM map_layers;
