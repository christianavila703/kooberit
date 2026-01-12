import { View, Text, StyleSheet } from "react-native";
import { useMemo, useCallback, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { statusBarHeight } from "@/constants/resources";
import { IRootState } from "@/store/index";
import { setMode } from "@/store/slices/authSlice";
import { TabSwitcher } from "@/components/ui/tab-switcher";

import ContractorDashboard from "@/components/dashboard/Contractor";
import HomeownerDashboard from "@/components/dashboard/Homeowner";
import { fetchProfileSettings } from "@/store/slices/profileSlice";

export default function DashboardScreen() {
    const dispatch = useAppDispatch();
    const { user, mode, isAuthenticated } = useAppSelector((state: IRootState) => state.auth);
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const isDark = useMemo(() => colorScheme === 'dark', [colorScheme]);
    const isContractor = useMemo(() => user?.role === 'contractor', [user?.role]);
    const showToggle = isContractor;

    const handleModeChange = useCallback((newMode: 'contractor' | 'homeowner') => {
        dispatch(setMode(newMode));
    }, [dispatch]);

    // Determine which dashboard to show based on mode
    const showContractorDashboard = useMemo(() => isContractor && mode === 'contractor', [isContractor, mode]);

    // Format name: if full name > 14 chars, show only first name (max 14 chars)
    const formattedName = useMemo(() => {
        if (!user?.firstName) return '';
        const fullName = `${user.firstName} ${user.lastName || ''}`.trim();
        if (fullName.length > 14) {
            return user.firstName.length > 14 
                ? user.firstName.substring(0, 14) 
                : user.firstName;
        }
        return fullName;
    }, [user?.firstName, user?.lastName]);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchProfileSettings());
        }
    }, [dispatch]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View>
                    <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
                    <Text style={[styles.name, { color: colors.text }]}>
                        {formattedName}
                    </Text>
                </View>

                {showToggle && (
                    <TabSwitcher
                        value={mode}
                        onValueChange={handleModeChange}
                        colors={colors}
                        isDark={isDark}
                    />
                )}
            </View>

            {showContractorDashboard ? <ContractorDashboard /> : <HomeownerDashboard />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: statusBarHeight,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 14,
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
    },
});