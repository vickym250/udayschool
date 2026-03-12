import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase"; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function SchoolManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // schoolData mein signatureUrl add kiya gaya hai
    const [schoolData, setSchoolData] = useState({
        name: "",
        slogan: "", 
        affiliation: "",
        address: "",
        contact: "",
        email: "",
        website: "",
        logoUrl: "",
        signatureUrl: "" 
    });

    const [newLogo, setNewLogo] = useState(null);
    const [newSignature, setNewSignature] = useState(null);

    // --- 1. Firebase se Data Fetch Karna ---
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "schoolDetails");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSchoolData(docSnap.data());
                }
            } catch (err) {
                console.error("Error fetching details:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // --- 2. Data aur Images Save Karna ---
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalLogoUrl = schoolData.logoUrl;
            let finalSignatureUrl = schoolData.signatureUrl;

            // Logo Upload Logic
            if (newLogo) {
                const logoRef = ref(storage, `school_assets/main_logo`);
                await uploadBytes(logoRef, newLogo);
                finalLogoUrl = await getDownloadURL(logoRef);
            }

            // Signature Upload Logic
            if (newSignature) {
                const sigRef = ref(storage, `school_assets/principal_signature`);
                await uploadBytes(sigRef, newSignature);
                finalSignatureUrl = await getDownloadURL(sigRef);
            }

            const updatedData = { 
                ...schoolData, 
                logoUrl: finalLogoUrl, 
                signatureUrl: finalSignatureUrl 
            };
            
            await setDoc(doc(db, "settings", "schoolDetails"), updatedData);
            
            setSchoolData(updatedData);
            setEditMode(false);
            setNewLogo(null);
            setNewSignature(null);
            alert("School Profile Update Ho Gayi Hain! ✅");
        } catch (err) {
            console.error(err);
            alert("Kuch error aaya hai bhai!");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold animate-pulse text-blue-900 text-xl">Details Load Ho Rahi Hain...</div>;

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-white text-2xl font-black uppercase tracking-wider">School Profile</h2>
                        <p className="text-blue-200 text-xs mt-1">Manage institutional assets and public details</p>
                    </div>
                    {!editMode && (
                        <button 
                            onClick={() => setEditMode(true)}
                            className="bg-white text-blue-900 px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-yellow-400 transition-all transform hover:scale-105"
                        >
                            ✏️ EDIT PROFILE
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="p-6 md:p-10">
                    <div className="flex flex-col md:flex-row gap-12">
                        
                        {/* LEFT SIDE: Images (Logo & Signature) */}
                        <div className="flex flex-col items-center space-y-10">
                            
                            {/* Logo Section */}
                            <div className="text-center">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 block">School Logo</label>
                                <div className="w-44 h-44 border-4 border-dashed border-blue-100 rounded-3xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner relative group">
                                    {newLogo ? (
                                        <img src={URL.createObjectURL(newLogo)} className="w-full h-full object-contain p-2" alt="New Logo" />
                                    ) : schoolData.logoUrl ? (
                                        <img src={schoolData.logoUrl} className="w-full h-full object-contain p-2" alt="Current Logo" />
                                    ) : (
                                        <span className="text-4xl">🏫</span>
                                    )}
                                </div>
                                {editMode && (
                                    <label className="mt-3 inline-block bg-blue-50 text-blue-700 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 transition-colors">
                                        Change Logo
                                        <input type="file" accept="image/*" onChange={(e) => setNewLogo(e.target.files[0])} className="hidden" />
                                    </label>
                                )}
                            </div>

                            {/* Signature Section */}
                            <div className="text-center w-full">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Authorized Signature</label>
                                <div className="w-full h-28 border-4 border-dashed border-green-100 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner relative">
                                    {newSignature ? (
                                        <img src={URL.createObjectURL(newSignature)} className="w-full h-full object-contain p-2" alt="New Signature" />
                                    ) : schoolData.signatureUrl ? (
                                        <img src={schoolData.signatureUrl} className="w-full h-full object-contain p-2" alt="Current Signature" />
                                    ) : (
                                        <span className="text-gray-400 font-bold text-xs">NO SIGNATURE</span>
                                    )}
                                </div>
                                {editMode && (
                                    <label className="mt-3 inline-block bg-green-50 text-green-700 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-green-100 transition-colors">
                                        Upload Signature
                                        <input type="file" accept="image/*" onChange={(e) => setNewSignature(e.target.files[0])} className="hidden" />
                                    </label>
                                )}
                                <p className="text-[9px] text-gray-400 mt-2 italic">*Transparent PNG recommended</p>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Text Fields */}
                        <div className="flex-1 space-y-8">
                            
                            {/* Name & Slogan */}
                            <div className="grid grid-cols-1 gap-6 border-b pb-8">
                                <DetailField 
                                    label="School Full Name" 
                                    value={schoolData.name} 
                                    isEdit={editMode} 
                                    onChange={(val) => setSchoolData({...schoolData, name: val})}
                                    important
                                />
                                <DetailField 
                                    label="Tagline / Motto" 
                                    value={schoolData.slogan} 
                                    isEdit={editMode} 
                                    onChange={(val) => setSchoolData({...schoolData, slogan: val})}
                                    placeholder="e.g. Lead us from darkness to light"
                                />
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <DetailField label="Affiliation" value={schoolData.affiliation} isEdit={editMode} onChange={(val) => setSchoolData({...schoolData, affiliation: val})} />
                                <DetailField label="Contact" value={schoolData.contact} isEdit={editMode} onChange={(val) => setSchoolData({...schoolData, contact: val})} />
                                <DetailField label="Email" value={schoolData.email} isEdit={editMode} onChange={(val) => setSchoolData({...schoolData, email: val})} type="email" />
                                <DetailField label="Website" value={schoolData.website} isEdit={editMode} onChange={(val) => setSchoolData({...schoolData, website: val})} />
                            </div>

                            {/* Address Area */}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2">Campus Address</label>
                                {editMode ? (
                                    <textarea 
                                        value={schoolData.address} 
                                        onChange={(e) => setSchoolData({...schoolData, address: e.target.value})}
                                        className="w-full p-4 border-2 border-blue-50 rounded-2xl outline-none focus:border-blue-500 transition-all bg-gray-50"
                                        rows="3"
                                    />
                                ) : (
                                    <p className="text-gray-700 font-semibold leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        {schoolData.address || "Please provide school address"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    {editMode && (
                        <div className="mt-12 flex flex-col md:flex-row gap-4 pt-8 border-t">
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl disabled:opacity-50 transition-all active:scale-95"
                            >
                                {saving ? "Uploading Assets..." : "💾 Update School Profile"}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => {setEditMode(false); setNewLogo(null); setNewSignature(null);}}
                                className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                            >
                                DISCARD
                            </button>
                        </div>
                    )}
                </form>

                <div className="bg-blue-900/5 p-4 text-center">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                        Note: Updated signature and logo will automatically reflect on all auto-generated documents.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Reusable Field Component
function DetailField({ label, value, isEdit, onChange, important = false, type="text", placeholder="" }) {
    return (
        <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
            {isEdit ? (
                <input 
                    type={type}
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full p-3 border-2 border-blue-50 rounded-xl outline-none focus:border-blue-500 transition-all bg-gray-50 ${important ? 'font-bold text-blue-900 border-blue-100' : 'text-gray-700'}`}
                />
            ) : (
                <p className={`${important ? 'text-xl font-black text-blue-900' : 'text-sm font-bold text-gray-700'} truncate`}>
                    {value || "Not Set"}
                </p>
            )}
        </div>
    );
}