import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import type {ImageStyle, StyleProp} from 'react-native';
import {Image, StyleSheet, View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import Avatar from '@components/Avatar';
import AvatarWithImagePicker from '@components/AvatarWithImagePicker';
import Button from '@components/Button';
import ConfirmModal from '@components/ConfirmModal';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import Section from '@components/Section';
import useActiveWorkspace from '@hooks/useActiveWorkspace';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import usePermissions from '@hooks/usePermissions';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeIllustrations from '@hooks/useThemeIllustrations';
import useThemeStyles from '@hooks/useThemeStyles';
import * as ErrorUtils from '@libs/ErrorUtils';
import getTopmostBottomTabRoute from '@libs/Navigation/getTopmostBottomTabRoute';
import Navigation, {navigationRef} from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {FullScreenNavigatorParamList, RootStackParamList, State} from '@libs/Navigation/types';
import Parser from '@libs/Parser';
import * as PolicyUtils from '@libs/PolicyUtils';
import * as ReportUtils from '@libs/ReportUtils';
import StringUtils from '@libs/StringUtils';
import * as UserUtils from '@libs/UserUtils';
import * as Policy from '@userActions/Policy/Policy';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import type {WithPolicyProps} from './withPolicy';
import withPolicy from './withPolicy';
import WorkspacePageWithSections from './WorkspacePageWithSections';

type WorkspaceProfilePageProps = WithPolicyProps & PlatformStackScreenProps<FullScreenNavigatorParamList, typeof SCREENS.WORKSPACE.PROFILE>;

function WorkspaceProfilePage({policyDraft, policy: policyProp, route}: WorkspaceProfilePageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const illustrations = useThemeIllustrations();
    const {activeWorkspaceID, setActiveWorkspaceID} = useActiveWorkspace();
    const {canUseSpotnanaTravel} = usePermissions();

    const [currencyList = {}] = useOnyx(ONYXKEYS.CURRENCY_LIST);
    const [currentUserAccountID = -1] = useOnyx(ONYXKEYS.SESSION, {selector: (session) => session?.accountID});

    // When we create a new workspace, the policy prop will be empty on the first render. Therefore, we have to use policyDraft until policy has been set in Onyx.
    const policy = policyDraft?.id ? policyDraft : policyProp;
    const isPolicyAdmin = PolicyUtils.isPolicyAdmin(policy);
    const outputCurrency = policy?.outputCurrency ?? '';
    const currencySymbol = currencyList?.[outputCurrency]?.symbol ?? '';
    const formattedCurrency = !isEmptyObject(policy) && !isEmptyObject(currencyList) ? `${outputCurrency} - ${currencySymbol}` : '';

    // We need this to update translation for deleting a workspace when it has third party card feeds or expensify card assigned.
    const workspaceAccountID = policy?.id ? PolicyUtils.getWorkspaceAccountID(policy.id) : CONST.DEFAULT_NUMBER_ID;
    const [cardFeeds] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${workspaceAccountID}`);
    const [cardsList] = useOnyx(`${ONYXKEYS.COLLECTION.WORKSPACE_CARDS_LIST}${workspaceAccountID}_${CONST.EXPENSIFY_CARD.BANK}`);
    const hasCardFeedOrExpensifyCard =
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        !isEmptyObject(cardFeeds) || !isEmptyObject(cardsList) || ((policy?.areExpensifyCardsEnabled || policy?.areCompanyCardsEnabled) && policy?.workspaceAccountID);

    const [street1, street2] = (policy?.address?.addressStreet ?? '').split('\n');
    const formattedAddress =
        !isEmptyObject(policy) && !isEmptyObject(policy.address)
            ? `${street1?.trim()}, ${street2 ? `${street2.trim()}, ` : ''}${policy.address.city}, ${policy.address.state} ${policy.address.zipCode ?? ''}`
            : '';

    const onPressCurrency = useCallback(() => {
        if (!policy?.id) {
            return;
        }
        Navigation.navigate(ROUTES.WORKSPACE_PROFILE_CURRENCY.getRoute(policy.id));
    }, [policy?.id]);
    const onPressAddress = useCallback(() => {
        if (!policy?.id) {
            return;
        }
        Navigation.navigate(ROUTES.WORKSPACE_PROFILE_ADDRESS.getRoute(policy.id));
    }, [policy?.id]);
    const onPressName = useCallback(() => {
        if (!policy?.id) {
            return;
        }
        Navigation.navigate(ROUTES.WORKSPACE_PROFILE_NAME.getRoute(policy.id));
    }, [policy?.id]);
    const onPressDescription = useCallback(() => {
        if (!policy?.id) {
            return;
        }
        Navigation.navigate(ROUTES.WORKSPACE_PROFILE_DESCRIPTION.getRoute(policy.id));
    }, [policy?.id]);
    const onPressShare = useCallback(() => {
        if (!policy?.id) {
            return;
        }
        Navigation.navigate(ROUTES.WORKSPACE_PROFILE_SHARE.getRoute(policy.id));
    }, [policy?.id]);
    const onPressPlanType = useCallback(() => {
        if (!policy?.id) {
            return;
        }
        Navigation.navigate(ROUTES.WORKSPACE_PROFILE_PLAN.getRoute(policy.id));
    }, [policy?.id]);
    const policyName = policy?.name ?? '';
    const policyDescription =
        // policy?.description can be an empty string
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        policy?.description ||
        Parser.replace(
            translate('workspace.common.welcomeNote', {
                workspaceName: policy?.name ?? '',
            }),
        );
    const readOnly = !PolicyUtils.isPolicyAdmin(policy);
    const isOwner = PolicyUtils.isPolicyOwner(policy, currentUserAccountID);
    const imageStyle: StyleProp<ImageStyle> = shouldUseNarrowLayout ? [styles.mhv12, styles.mhn5, styles.mbn5] : [styles.mhv8, styles.mhn8, styles.mbn5];
    const shouldShowAddress = !readOnly || !!formattedAddress;

    const fetchPolicyData = useCallback(() => {
        if (policyDraft?.id) {
            return;
        }
        Policy.openPolicyProfilePage(route.params.policyID);
    }, [policyDraft?.id, route.params.policyID]);

    useNetwork({onReconnect: fetchPolicyData});

    // We have the same focus effect in the WorkspaceInitialPage, this way we can get the policy data in narrow
    // as well as in the wide layout when looking at policy settings.
    useFocusEffect(
        useCallback(() => {
            fetchPolicyData();
        }, [fetchPolicyData]),
    );

    const DefaultAvatar = useCallback(
        () => (
            <Avatar
                containerStyles={styles.avatarXLarge}
                imageStyles={[styles.avatarXLarge, styles.alignSelfCenter]}
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- nullish coalescing cannot be used if left side can be empty string
                source={policy?.avatarURL || ReportUtils.getDefaultWorkspaceAvatar(policyName)}
                fallbackIcon={Expensicons.FallbackWorkspaceAvatar}
                size={CONST.AVATAR_SIZE.XLARGE}
                name={policyName}
                avatarID={policy?.id}
                type={CONST.ICON_TYPE_WORKSPACE}
            />
        ),
        [policy?.avatarURL, policy?.id, policyName, styles.alignSelfCenter, styles.avatarXLarge],
    );

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const confirmDeleteAndHideModal = useCallback(() => {
        if (!policy?.id || !policyName) {
            return;
        }

        Policy.deleteWorkspace(policy.id, policyName);
        setIsDeleteModalOpen(false);

        // If the workspace being deleted is the active workspace, switch to the "All Workspaces" view
        if (activeWorkspaceID === policy.id) {
            setActiveWorkspaceID(undefined);
            Navigation.dismissModal();
            const rootState = navigationRef.current?.getRootState() as State<RootStackParamList>;
            const topmostBottomTabRoute = getTopmostBottomTabRoute(rootState);
            if (topmostBottomTabRoute?.name === SCREENS.SETTINGS.ROOT) {
                Navigation.setParams({policyID: undefined}, topmostBottomTabRoute?.key);
            }
        }
    }, [policy?.id, policyName, activeWorkspaceID, setActiveWorkspaceID]);

    return (
        <WorkspacePageWithSections
            headerText={translate('workspace.common.profile')}
            route={route}
            guidesCallTaskID={CONST.GUIDES_CALL_TASK_IDS.WORKSPACE_PROFILE}
            // When we create a new workspaces, the policy prop will not be set on the first render. Therefore, we have to delay rendering until it has been set in Onyx.
            shouldShowLoading={policy === undefined}
            shouldUseScrollView
            shouldShowOfflineIndicatorInWideScreen
            shouldShowNonAdmin
            icon={Illustrations.Building}
            shouldShowNotFoundPage={policy === undefined}
        >
            {(hasVBA?: boolean) => (
                <View style={[styles.flex1, styles.mt3, shouldUseNarrowLayout ? styles.workspaceSectionMobile : styles.workspaceSection]}>
                    <Section
                        isCentralPane
                        title=""
                    >
                        <Image
                            style={StyleSheet.flatten([styles.wAuto, styles.h68, imageStyle])}
                            source={illustrations.WorkspaceProfile}
                            resizeMode="cover"
                        />
                        <AvatarWithImagePicker
                            onViewPhotoPress={() => {
                                if (!policy?.id) {
                                    return;
                                }
                                Navigation.navigate(ROUTES.WORKSPACE_AVATAR.getRoute(policy.id));
                            }}
                            source={policy?.avatarURL ?? ''}
                            avatarID={policy?.id}
                            size={CONST.AVATAR_SIZE.XLARGE}
                            avatarStyle={styles.avatarXLarge}
                            enablePreview
                            DefaultAvatar={DefaultAvatar}
                            type={CONST.ICON_TYPE_WORKSPACE}
                            fallbackIcon={Expensicons.FallbackWorkspaceAvatar}
                            style={[
                                policy?.errorFields?.avatarURL ?? shouldUseNarrowLayout ? styles.mb1 : styles.mb3,
                                shouldUseNarrowLayout ? styles.mtn17 : styles.mtn20,
                                styles.alignItemsStart,
                                styles.sectionMenuItemTopDescription,
                            ]}
                            editIconStyle={styles.smallEditIconWorkspace}
                            isUsingDefaultAvatar={!policy?.avatarURL ?? false}
                            onImageSelected={(file) => {
                                if (!policy?.id) {
                                    return;
                                }
                                Policy.updateWorkspaceAvatar(policy.id, file as File);
                            }}
                            onImageRemoved={() => {
                                if (!policy?.id) {
                                    return;
                                }
                                Policy.deleteWorkspaceAvatar(policy.id);
                            }}
                            editorMaskImage={Expensicons.ImageCropSquareMask}
                            pendingAction={policy?.pendingFields?.avatarURL}
                            errors={policy?.errorFields?.avatarURL}
                            onErrorClose={() => {
                                if (!policy?.id) {
                                    return;
                                }
                                Policy.clearAvatarErrors(policy.id);
                            }}
                            previewSource={UserUtils.getFullSizeAvatar(policy?.avatarURL ?? '')}
                            headerTitle={translate('workspace.common.workspaceAvatar')}
                            originalFileName={policy?.originalFileName}
                            disabled={readOnly}
                            disabledStyle={styles.cursorDefault}
                            errorRowStyles={styles.mt3}
                        />
                        <OfflineWithFeedback pendingAction={policy?.pendingFields?.name}>
                            <MenuItemWithTopDescription
                                title={policyName}
                                titleStyle={styles.workspaceTitleStyle}
                                description={translate('workspace.common.workspaceName')}
                                shouldShowRightIcon={!readOnly}
                                disabled={readOnly}
                                wrapperStyle={[styles.sectionMenuItemTopDescription, shouldUseNarrowLayout ? styles.mt3 : {}]}
                                onPress={onPressName}
                                shouldGreyOutWhenDisabled={false}
                                shouldUseDefaultCursorWhenDisabled
                            />
                        </OfflineWithFeedback>
                        {(!StringUtils.isEmptyString(policy?.description ?? '') || !readOnly) && (
                            <OfflineWithFeedback
                                pendingAction={policy?.pendingFields?.description}
                                errors={ErrorUtils.getLatestErrorField(policy ?? {}, CONST.POLICY.COLLECTION_KEYS.DESCRIPTION)}
                                onClose={() => {
                                    if (!policy?.id) {
                                        return;
                                    }
                                    Policy.clearPolicyErrorField(policy.id, CONST.POLICY.COLLECTION_KEYS.DESCRIPTION);
                                }}
                            >
                                <MenuItemWithTopDescription
                                    title={policyDescription}
                                    description={translate('workspace.editor.descriptionInputLabel')}
                                    shouldShowRightIcon={!readOnly}
                                    disabled={readOnly}
                                    wrapperStyle={styles.sectionMenuItemTopDescription}
                                    onPress={onPressDescription}
                                    shouldGreyOutWhenDisabled={false}
                                    shouldUseDefaultCursorWhenDisabled
                                    shouldRenderAsHTML
                                />
                            </OfflineWithFeedback>
                        )}
                        <OfflineWithFeedback
                            pendingAction={policy?.pendingFields?.outputCurrency}
                            errors={ErrorUtils.getLatestErrorField(policy ?? {}, CONST.POLICY.COLLECTION_KEYS.GENERAL_SETTINGS)}
                            onClose={() => {
                                if (!policy?.id) {
                                    return;
                                }
                                Policy.clearPolicyErrorField(policy.id, CONST.POLICY.COLLECTION_KEYS.GENERAL_SETTINGS);
                            }}
                            errorRowStyles={[styles.mt2]}
                        >
                            <View>
                                <MenuItemWithTopDescription
                                    title={formattedCurrency}
                                    description={translate('workspace.editor.currencyInputLabel')}
                                    shouldShowRightIcon={!readOnly}
                                    disabled={hasVBA ? true : readOnly}
                                    wrapperStyle={styles.sectionMenuItemTopDescription}
                                    onPress={onPressCurrency}
                                    shouldGreyOutWhenDisabled={false}
                                    shouldUseDefaultCursorWhenDisabled
                                    hintText={hasVBA ? translate('workspace.editor.currencyInputDisabledText') : translate('workspace.editor.currencyInputHelpText')}
                                />
                            </View>
                        </OfflineWithFeedback>
                        {!!canUseSpotnanaTravel && shouldShowAddress && (
                            <OfflineWithFeedback pendingAction={policy?.pendingFields?.address}>
                                <View>
                                    <MenuItemWithTopDescription
                                        title={formattedAddress}
                                        description={translate('common.companyAddress')}
                                        shouldShowRightIcon={!readOnly}
                                        disabled={readOnly}
                                        wrapperStyle={styles.sectionMenuItemTopDescription}
                                        onPress={onPressAddress}
                                        shouldGreyOutWhenDisabled={false}
                                        shouldUseDefaultCursorWhenDisabled
                                    />
                                </View>
                            </OfflineWithFeedback>
                        )}

                        {!readOnly && !!policy?.type && (
                            <OfflineWithFeedback pendingAction={policy?.pendingFields?.type}>
                                <View>
                                    <MenuItemWithTopDescription
                                        title={PolicyUtils.getUserFriendlyWorkspaceType(policy.type)}
                                        description={translate('workspace.common.planType')}
                                        shouldShowRightIcon={!readOnly}
                                        disabled={readOnly}
                                        wrapperStyle={styles.sectionMenuItemTopDescription}
                                        onPress={onPressPlanType}
                                        shouldGreyOutWhenDisabled={false}
                                        shouldUseDefaultCursorWhenDisabled
                                    />
                                </View>
                            </OfflineWithFeedback>
                        )}
                        {!readOnly && (
                            <View style={[styles.flexRow, styles.mt6, styles.mnw120]}>
                                {isPolicyAdmin && (
                                    <Button
                                        accessibilityLabel={translate('common.invite')}
                                        text={translate('common.invite')}
                                        onPress={() => Navigation.navigate(ROUTES.WORKSPACE_INVITE.getRoute(route.params.policyID, Navigation.getActiveRouteWithoutParams()))}
                                        icon={Expensicons.UserPlus}
                                        style={[styles.mr2]}
                                    />
                                )}
                                <Button
                                    accessibilityLabel={translate('common.share')}
                                    text={translate('common.share')}
                                    onPress={onPressShare}
                                    icon={Expensicons.QrCode}
                                />
                                {isOwner && (
                                    <Button
                                        accessibilityLabel={translate('common.delete')}
                                        text={translate('common.delete')}
                                        style={[styles.ml2]}
                                        onPress={() => setIsDeleteModalOpen(true)}
                                        icon={Expensicons.Trashcan}
                                    />
                                )}
                            </View>
                        )}
                    </Section>
                    <ConfirmModal
                        title={translate('workspace.common.delete')}
                        isVisible={isDeleteModalOpen}
                        onConfirm={confirmDeleteAndHideModal}
                        onCancel={() => setIsDeleteModalOpen(false)}
                        prompt={hasCardFeedOrExpensifyCard ? translate('workspace.common.deleteWithCardsConfirmation') : translate('workspace.common.deleteConfirmation')}
                        confirmText={translate('common.delete')}
                        cancelText={translate('common.cancel')}
                        danger
                    />
                </View>
            )}
        </WorkspacePageWithSections>
    );
}

WorkspaceProfilePage.displayName = 'WorkspaceProfilePage';

export default withPolicy(WorkspaceProfilePage);
