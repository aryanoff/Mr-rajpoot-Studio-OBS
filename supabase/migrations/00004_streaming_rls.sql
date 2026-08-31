-- ENABLE RLS
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_status_logs ENABLE ROW LEVEL SECURITY;

-- STREAMS POLICIES
CREATE POLICY "Users can view their own streams" ON public.streams FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert their own streams" ON public.streams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streams" ON public.streams FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can delete their own streams" ON public.streams FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- STREAM DESTINATIONS POLICIES
CREATE POLICY "Users can view their own destinations" ON public.stream_destinations FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert their own destinations" ON public.stream_destinations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own destinations" ON public.stream_destinations FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can delete their own destinations" ON public.stream_destinations FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- STREAM SOURCES POLICIES
CREATE POLICY "Users can view their own sources" ON public.stream_sources FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert their own sources" ON public.stream_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sources" ON public.stream_sources FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can delete their own sources" ON public.stream_sources FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- SCHEDULES POLICIES
CREATE POLICY "Users can view their own schedules" ON public.schedules FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert their own schedules" ON public.schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedules" ON public.schedules FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can delete their own schedules" ON public.schedules FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- STREAM STATUS LOGS POLICIES (Users can only read)
CREATE POLICY "Users can view logs of their streams" ON public.stream_status_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.streams WHERE id = stream_status_logs.stream_id AND (user_id = auth.uid() OR public.is_admin()))
);

