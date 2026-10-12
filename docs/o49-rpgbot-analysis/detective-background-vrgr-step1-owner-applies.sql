-- O49, 2026-10-10: передісторія VRGR «Investigator» (Van Richten's Guide to Ravenloft, с. 35) → українською «Детектив» (назву погодив власник).
-- Крок 1 з 2: нове значення переліку. Застосовується ОКРЕМО й раніше за крок 2 (нове значення переліку недоступне в тій самій транзакції).
ALTER TYPE "BackgroundCategory" ADD VALUE IF NOT EXISTS 'INVESTIGATOR_VRGTR';
