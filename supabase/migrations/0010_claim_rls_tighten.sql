-- Tighten RLS so owner writes require an APPROVED claim on that specific
-- resource, not just "this row belongs to me". Without this, a signed-in user
-- could write resource_owner_content or submit resource_edit_proposals for any
-- resource_id, whether or not they've ever claimed it — the original policies
-- only checked user_id ownership of the row being written, not permission over
-- the resource itself. Pushing this into RLS (rather than trusting the client
-- UI to only call it correctly) means it's enforced no matter how the write is
-- made.

DROP POLICY "resource_owner_content_own_write" ON public.resource_owner_content;

CREATE POLICY "resource_owner_content_claimed_write" ON public.resource_owner_content
  FOR ALL USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.resource_claims rc
      WHERE rc.resource_id = resource_owner_content.resource_id
        AND rc.user_id = auth.uid() AND rc.status = 'approved'
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.resource_claims rc
      WHERE rc.resource_id = resource_owner_content.resource_id
        AND rc.user_id = auth.uid() AND rc.status = 'approved'
    )
  );

DROP POLICY "resource_edit_proposals_own_insert" ON public.resource_edit_proposals;

CREATE POLICY "resource_edit_proposals_claimed_insert" ON public.resource_edit_proposals
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.resource_claims rc
      WHERE rc.resource_id = resource_edit_proposals.resource_id
        AND rc.user_id = auth.uid() AND rc.status = 'approved'
    )
  );
