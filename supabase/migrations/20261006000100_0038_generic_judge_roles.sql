-- 0038: generic judge volunteer roles. The keys stay (volunteer rows reference them);
-- only the labels and descriptions change, to match lib/volunteer-roles.ts.
update public.contest_volunteer_roles
   set label = 'Freestyle Judge',
       description = 'Scores routines on a judging panel. Goal: 3–4 judges per panel plus a senior judge.'
 where role_key = 'sport_division_judge';
update public.contest_volunteer_roles
   set label = 'Head / Senior Judge',
       description = 'Leads a judging panel and scores routines. Best for experienced judges.'
 where role_key = '1a_pro_judge';
update public.contest_volunteer_roles
   set label = 'Judge (second panel)',
       description = 'Scores routines on a second panel, for contests that judge divisions in parallel.'
 where role_key = 'x_division_judge';
