-- Clean up room_no where string contained double "Room Room"
UPDATE orders
SET 
  room_no = TRIM(COALESCE(
    NULLIF(substring(data->>'deliveryAddress' from '(?i)Room\s+(?:Room\s+)?([0-9]+[A-Za-z]?)'), ''),
    room_no
  )),
  "room No." = TRIM(COALESCE(
    NULLIF(substring(data->>'deliveryAddress' from '(?i)Room\s+(?:Room\s+)?([0-9]+[A-Za-z]?)'), ''),
    room_no
  ));

UPDATE orders
SET data = data || jsonb_build_object(
  'roomNo', room_no
);
