// data/traits.js — traits earned from battle history. Each has a short story hook.
"use strict";

const TRAITS = {
  scarred:       { name: "Scarred",        desc: "Survived near death. +2 DEF.",                      def: 2 },
  captainSlayer: { name: "Captain Slayer", desc: "Felled an enemy captain. +25% damage vs captains.", vsCaptain: 1.25 },
  gatebreaker:   { name: "Gatebreaker",    desc: "Shattered a fort gate. Double damage to gates.",    vsGate: 2 },
  loyal:         { name: "Loyal",          desc: "Bound to the Warden. Loyalty never drops below 30." },
  vengeful:      { name: "Vengeful",       desc: "Watched an ally fall. +3 ATK when below half health.", rageAtk: 3 },
  cowardly:      { name: "Cowardly",       desc: "Broke and ran once. May flee when badly hurt." },
  beastBonded:   { name: "Beast-Bonded",   desc: "Fights harder beside the Warden. +2 ATK when following.", followAtk: 2 },
  defender:      { name: "Defender",       desc: "Held the line. +3 DEF while guarding the base.",    guardDef: 3 },
  raider:        { name: "Raider",         desc: "Veteran of invasions. +2 ATK during invasions.",    invadeAtk: 2 },
  proud:         { name: "Proud",          desc: "Gains morale from victory, but sulks after defeat." }
};

const PERSONALITIES = ["Fierce", "Timid", "Loyal-hearted", "Sly", "Stubborn", "Playful", "Grim", "Proud"];
